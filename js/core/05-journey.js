import { KEYS, readJson, writeJson, removeKey } from './01-storage.js';
import { daysBetween, shiftDateKey, localDateKey } from './02-date.js';
import { getAllRecords, normalizeDay, getDayFoodCalories } from './03-records.js';
import {
  calculateMaintenanceCalories,
  calculatePlannedTargetCalories,
  KCAL_PER_KG_APPROX
} from './04-calculations.js';

export function getProfile() {
  return readJson(KEYS.PROFILE, null);
}

export function getJourney() {
  return readJson(KEYS.JOURNEY, null);
}

export function getWeeklyWeights() {
  return readJson(KEYS.WEEKLY_WEIGHTS, []);
}

export function saveProfileAndJourney(profile, journey) {
  // Chỉ chặn khi CẢ HAI đã tồn tại — tức hành trình thật sự hoàn chỉnh.
  // Nếu chỉ còn một trong hai (dữ liệu lỗi/dở dang), coi như chưa có hành
  // trình hợp lệ và cho phép lưu lại để tự phục hồi, thay vì kẹt cứng.
  if (getProfile() && getJourney()) {
    throw new Error('Hành trình đã được thiết lập. Muốn nhập lại từ đầu, hãy xóa toàn bộ dữ liệu ở cuối trang Cá nhân.');
  }

  writeJson(KEYS.PROFILE, profile);
  writeJson(KEYS.JOURNEY, journey);
}

export function saveWeeklyWeight(date, weight) {
  const journey = getJourney();
  if (!journey) throw new Error('Chưa có hành trình.');
  if (date <= journey.startDate) {
    throw new Error('Mốc cân thực tế phải sau ngày bắt đầu để giữ nguyên cân nặng ban đầu.');
  }
  if (date > journey.endDate) {
    throw new Error('Mốc cân thực tế phải nằm trong thời gian của hành trình.');
  }

  const numericWeight = Number(weight);
  if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
    throw new Error('Cân nặng không hợp lệ.');
  }

  const weights = getWeeklyWeights();
  const existing = weights.find(item => item.date === date);

  if (existing) {
    existing.weight = numericWeight;
    existing.updatedAt = Date.now();
  } else {
    weights.push({ date, weight: numericWeight, updatedAt: Date.now() });
  }

  weights.sort((a, b) => a.date.localeCompare(b.date));
  writeJson(KEYS.WEEKLY_WEIGHTS, weights);
  return weights;
}

export function deleteWeeklyWeight(date) {
  const next = getWeeklyWeights().filter(item => item.date !== date);
  writeJson(KEYS.WEEKLY_WEIGHTS, next);
  return next;
}

export function resetJourneyOnly() {
  removeKey(KEYS.PROFILE);
  removeKey(KEYS.JOURNEY);
  removeKey(KEYS.WEEKLY_WEIGHTS);
}

/**
 * Mô phỏng hành trình theo nguyên tắc "mốc 1 kg":
 *
 * 1. Cân nặng dùng để tính mục tiêu calo KHÔNG thay đổi theo số lẻ mỗi ngày.
 * 2. Mục tiêu calo chỉ được tính lại khi:
 *    - thâm hụt/thặng dư năng lượng tích lũy đủ tương đương 1 kg; hoặc
 *    - người dùng nhập cân thật (mốc cân thật có ưu tiên cao nhất).
 * 3. Cân thật chỉ ghi đè tại ngày nhập và trở thành điểm neo mới.
 *    journey.startWeight tuyệt đối không bị sửa.
 * 4. Khi có cân thật, phần năng lượng tích lũy dở dang trước đó bị reset,
 *    vì mốc thực tế đã hiệu chỉnh lại sai số của phép ước tính.
 *
 * capToToday (mặc định true): giới hạn mô phỏng không vượt quá hôm nay,
 * vì app không đoán trước dữ liệu ăn/tập của những ngày chưa tới. Đặt
 * false khi cần xem trước hiệu ứng của các mốc cân thật đã nhập cho ngày
 * tương lai (ví dụ khi đang test biểu đồ) — chỉ dùng cho việc vẽ biểu đồ,
 * không dùng cho các phép tính "hiện tại" như mục tiêu calo hôm nay.
 */
export function simulateJourney({ throughDate = localDateKey(), includeFuturePlan = true, capToToday = true } = {}) {
  const profile = getProfile();
  const journey = getJourney();
  if (!profile || !journey) return null;

  const records = getAllRecords();
  const checkins = new Map(getWeeklyWeights().map(item => [item.date, Number(item.weight)]));
  const today = localDateKey();
  const actualEnd = capToToday
    ? minDateKey(throughDate, today, journey.endDate)
    : minDateKey(throughDate, journey.endDate);
  const totalDays = Math.max(1, daysBetween(journey.startDate, journey.endDate));

  const estimated = [];
  const planned = [];
  const checkinPoints = [];
  const milestones = [];
  const targetEvents = [];

  let currentWeight = Number(journey.startWeight);
  let accumulatedEnergy = 0;
  let activeTarget = createTarget(profile, journey, currentWeight, journey.startDate);

  targetEvents.push(createTargetEvent({
    date: journey.startDate,
    weight: currentWeight,
    reason: 'start',
    target: activeTarget
  }));

  const estimateDays = actualEnd < journey.startDate
    ? -1
    : Math.max(0, daysBetween(journey.startDate, actualEnd));

  for (let i = 0; i <= estimateDays; i += 1) {
    const date = shiftDateKey(journey.startDate, i);

    // Cân thật ghi đè NGAY trong ngày nhập — đây là số đo thật, không phải
    // suy luận, nên không cần "xếp hàng" như mốc tính từ calo.
    if (i > 0 && checkins.has(date)) {
      currentWeight = Number(checkins.get(date));
      accumulatedEnergy = 0;
      activeTarget = createTarget(profile, journey, currentWeight, date);
      checkinPoints.push({ date, weight: roundWeight(currentWeight) });
      targetEvents.push(createTargetEvent({
        date,
        weight: currentWeight,
        reason: 'checkin',
        target: activeTarget
      }));
    }

    // Ảnh chụp đầu ngày: toàn bộ số liệu HIỂN THỊ và phép tính của ngày hôm
    // nay đều dùng đúng cân nặng/mục tiêu đang có hiệu lực tại đầu ngày.
    // Nếu trong ngày tích đủ mốc 1kg, cân mới KHÔNG chen vào ngày hôm nay —
    // nó chỉ có hiệu lực từ ngày mai, nên số liệu ngày hôm nay luôn khớp với
    // đúng con số đã thực sự được dùng để tính ra kết quả đó.
    const dayStartWeight = currentWeight;
    const dayStartMaintenance = calculateMaintenanceCalories(profile, dayStartWeight);
    const dayStartTarget = activeTarget;

    const day = normalizeDay(records[date]);
    const intake = getDayFoodCalories(day);
    const exercise = Number(day.exerciseCalories) || 0;
    // Chỉ ngày đã được người dùng bấm "Xác nhận không nạp thêm calo" mới
    // được coi là dữ liệu chốt của ngày đó. Ngày chưa xác nhận (kể cả có
    // ghi món ăn dở dang) không tham gia tính chênh lệch năng lượng, để
    // tránh hiểu nhầm "mới ăn sáng" thành "cả ngày chỉ ăn từng đó".
    const hasLoggedEnergy = Boolean(day.confirmed);
    let dailyEnergyBalance = 0;

    if (hasLoggedEnergy) {
      dailyEnergyBalance = dayStartMaintenance + exercise - intake;
      accumulatedEnergy += dailyEnergyBalance;

      // Đủ một bậc 1kg thì cân đổi, nhưng chỉ có hiệu lực TỪ NGÀY MAI —
      // xếp hàng, không chen ngược vào chính ngày đã dùng để tính ra nó.
      const effectiveDate = shiftDateKey(date, 1);

      while (accumulatedEnergy >= KCAL_PER_KG_APPROX) {
        currentWeight = roundWeight(currentWeight - 1);
        accumulatedEnergy -= KCAL_PER_KG_APPROX;

        milestones.push({ date: effectiveDate, weight: currentWeight, direction: 'down' });
        activeTarget = createTarget(profile, journey, currentWeight, effectiveDate);
        targetEvents.push(createTargetEvent({
          date: effectiveDate,
          weight: currentWeight,
          reason: 'energy-milestone',
          target: activeTarget
        }));
      }

      while (accumulatedEnergy <= -KCAL_PER_KG_APPROX) {
        currentWeight = roundWeight(currentWeight + 1);
        accumulatedEnergy += KCAL_PER_KG_APPROX;

        milestones.push({ date: effectiveDate, weight: currentWeight, direction: 'up' });
        activeTarget = createTarget(profile, journey, currentWeight, effectiveDate);
        targetEvents.push(createTargetEvent({
          date: effectiveDate,
          weight: currentWeight,
          reason: 'energy-milestone',
          target: activeTarget
        }));
      }
    }

    estimated.push({
      date,
      weight: roundWeight(dayStartWeight),
      accumulatedEnergy: roundEnergy(accumulatedEnergy),
      dailyEnergyBalance: roundEnergy(dailyEnergyBalance),
      targetCalories: dayStartTarget.targetCalories,
      maintenance: dayStartMaintenance,
      requiredDailyBalance: dayStartTarget.requiredDailyBalance,
      softFloorApplied: dayStartTarget.softFloorApplied
    });
  }

  if (includeFuturePlan) {
    for (let i = 0; i <= totalDays; i += 1) {
      const date = shiftDateKey(journey.startDate, i);
      const ratio = i / totalDays;
      const weight = Number(journey.startWeight)
        + ((Number(journey.targetWeight) - Number(journey.startWeight)) * ratio);
      planned.push({ date, weight: roundWeight(weight) });
    }
  }

  // "Hiện tại" luôn khớp với đúng ảnh chụp của ngày cuối cùng đã mô phỏng —
  // kể cả khi ngày đó vừa đủ mốc 1kg (giá trị mới chỉ thật sự "hiện diện"
  // từ ngày mai, nên chưa được coi là hiện tại ở đây).
  const lastPoint = estimated.at(-1);

  return {
    profile,
    journey,
    estimated,
    planned,
    checkinPoints,
    milestones,
    targetEvents,
    currentWeight: lastPoint ? lastPoint.weight : roundWeight(currentWeight),
    accumulatedEnergy: roundEnergy(accumulatedEnergy),
    activeTarget: lastPoint
      ? {
          targetCalories: lastPoint.targetCalories,
          maintenance: lastPoint.maintenance,
          requiredDailyBalance: lastPoint.requiredDailyBalance,
          softFloorApplied: lastPoint.softFloorApplied
        }
      : activeTarget
  };
}

export function getEstimatedWeightForDate(dateKey) {
  const journey = getJourney();
  if (!journey || dateKey < journey.startDate) return null;

  const simulation = simulateJourney({ throughDate: dateKey, includeFuturePlan: false });
  if (!simulation || simulation.estimated.length === 0) return null;
  return simulation.estimated[simulation.estimated.length - 1].weight;
}

/**
 * Trả về mục tiêu calo ĐANG CÓ HIỆU LỰC ở ngày được hỏi.
 *
 * - Trước ngày bắt đầu / sau ngày kết thúc: null.
 * - Không có hồ sơ/hành trình: null.
 * - Ngày trôi qua không tự làm đổi mục tiêu.
 * - Mục tiêu chỉ đổi tại mốc 1 kg hoặc mốc cân thật.
 */
export function getCalorieTargetsForDate(dateKey) {
  const profile = getProfile();
  const journey = getJourney();
  if (!profile || !journey) return null;
  if (dateKey < journey.startDate || dateKey > journey.endDate) return null;

  const simulation = simulateJourney({ throughDate: dateKey, includeFuturePlan: false });
  if (!simulation) return null;

  // Không lấy event mốc 1kg vừa "xếp hàng cho ngày mai" nếu nó vượt quá
  // đúng ngày đang hỏi — event đó chưa thật sự có hiệu lực tại dateKey.
  const lastTargetEvent = [...simulation.targetEvents].reverse().find(event => event.date <= dateKey);
  return {
    ...simulation.activeTarget,
    currentWeight: simulation.currentWeight,
    anchorDate: lastTargetEvent?.date || journey.startDate,
    anchorReason: lastTargetEvent?.reason || 'start'
  };
}

function createTarget(profile, journey, currentWeight, eventDate) {
  return calculatePlannedTargetCalories({
    profile,
    currentWeight,
    targetWeight: Number(journey.targetWeight),
    currentDate: eventDate,
    endDate: journey.endDate,
    daysBetween
  });
}

function createTargetEvent({ date, weight, reason, target }) {
  return {
    date,
    weight: roundWeight(weight),
    reason,
    targetCalories: target.targetCalories,
    maintenance: target.maintenance,
    requiredDailyBalance: target.requiredDailyBalance,
    softFloorApplied: target.softFloorApplied
  };
}

function minDateKey(...dateKeys) {
  return dateKeys.slice().sort()[0];
}

function roundWeight(value) {
  return Math.round(Number(value) * 100) / 100;
}

function roundEnergy(value) {
  return Math.round(Number(value) * 10) / 10;
}