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
  if (getProfile() || getJourney()) {
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
  if (date > localDateKey()) throw new Error('Không thể nhập cân nặng cho ngày tương lai.');

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
 */
export function simulateJourney({ throughDate = localDateKey(), includeFuturePlan = true } = {}) {
  const profile = getProfile();
  const journey = getJourney();
  if (!profile || !journey) return null;

  const records = getAllRecords();
  const checkins = new Map(getWeeklyWeights().map(item => [item.date, Number(item.weight)]));
  const today = localDateKey();
  const actualEnd = minDateKey(throughDate, today, journey.endDate);
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

    // Cân thật được áp dụng TRƯỚC phép tính của ngày đó và có ưu tiên cao nhất.
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
      // Dùng cân nặng MỐC hiện tại, không dùng cân lẻ lý thuyết.
      const maintenance = calculateMaintenanceCalories(profile, currentWeight);
      dailyEnergyBalance = maintenance + exercise - intake;
      accumulatedEnergy += dailyEnergyBalance;

      // Chỉ thay đổi cân khi tích lũy đủ một bậc 1 kg.
      // Số dư được giữ lại cho bậc tiếp theo.
      while (accumulatedEnergy >= KCAL_PER_KG_APPROX) {
        currentWeight = roundWeight(currentWeight - 1);
        accumulatedEnergy -= KCAL_PER_KG_APPROX;

        milestones.push({ date, weight: currentWeight, direction: 'down' });
        activeTarget = createTarget(profile, journey, currentWeight, date);
        targetEvents.push(createTargetEvent({
          date,
          weight: currentWeight,
          reason: 'energy-milestone',
          target: activeTarget
        }));
      }

      while (accumulatedEnergy <= -KCAL_PER_KG_APPROX) {
        currentWeight = roundWeight(currentWeight + 1);
        accumulatedEnergy += KCAL_PER_KG_APPROX;

        milestones.push({ date, weight: currentWeight, direction: 'up' });
        activeTarget = createTarget(profile, journey, currentWeight, date);
        targetEvents.push(createTargetEvent({
          date,
          weight: currentWeight,
          reason: 'energy-milestone',
          target: activeTarget
        }));
      }
    }

    estimated.push({
      date,
      weight: roundWeight(currentWeight),
      accumulatedEnergy: roundEnergy(accumulatedEnergy),
      dailyEnergyBalance: roundEnergy(dailyEnergyBalance),
      targetCalories: activeTarget.targetCalories,
      maintenance: calculateMaintenanceCalories(profile, currentWeight)
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

  return {
    profile,
    journey,
    estimated,
    planned,
    checkinPoints,
    milestones,
    targetEvents,
    currentWeight: roundWeight(currentWeight),
    accumulatedEnergy: roundEnergy(accumulatedEnergy),
    activeTarget
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

  const lastTargetEvent = simulation.targetEvents.at(-1);
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