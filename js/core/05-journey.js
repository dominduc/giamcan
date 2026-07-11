import { KEYS, readJson, writeJson, removeKey } from './01-storage.js';
import { daysBetween, shiftDateKey, localDateKey } from './02-date.js';
import { getAllRecords, normalizeDay, getDayFoodCalories } from './03-records.js';
import { calculateMaintenanceCalories, calculatePlannedTargetCalories, KCAL_PER_KG_APPROX } from './04-calculations.js';

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
  writeJson(KEYS.PROFILE, profile);
  writeJson(KEYS.JOURNEY, journey);
}

export function saveWeeklyWeight(date, weight) {
  const journey = getJourney();
  if (!journey) throw new Error('Chưa có hành trình.');
  if (date <= journey.startDate) throw new Error('Mốc cân thực tế phải sau ngày bắt đầu để giữ nguyên cân nặng ban đầu.');
  if (date > localDateKey()) throw new Error('Không thể nhập cân nặng cho ngày tương lai.');

  const weights = getWeeklyWeights();
  const numericWeight = Number(weight);
  const existing = weights.find(item => item.date === date);
  if (existing) existing.weight = numericWeight;
  else weights.push({ date, weight: numericWeight, updatedAt: Date.now() });
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

export function simulateJourney({ throughDate = localDateKey(), includeFuturePlan = true } = {}) {
  const profile = getProfile();
  const journey = getJourney();
  if (!profile || !journey) return null;

  const records = getAllRecords();
  const checkins = new Map(getWeeklyWeights().map(item => [item.date, Number(item.weight)]));
  const today = localDateKey();
  const actualEnd = throughDate < today ? throughDate : today;
  const totalDays = Math.max(1, daysBetween(journey.startDate, journey.endDate));

  const estimated = [];
  const planned = [];
  const checkinPoints = [];
  const milestones = [];

  let currentWeight = Number(journey.startWeight);
  let lastMilestone = Math.floor(currentWeight);
  const estimateDays = Math.max(0, daysBetween(journey.startDate, actualEnd));

  for (let i = 0; i <= estimateDays; i += 1) {
    const date = shiftDateKey(journey.startDate, i);

    // Mốc cân thực tế chỉ ghi đè cân tại ngày đó và trở thành điểm neo cho các ngày sau.
    // startWeight ban đầu trong journey không bao giờ bị thay đổi.
    if (i > 0 && checkins.has(date)) {
      currentWeight = checkins.get(date);
      checkinPoints.push({ date, weight: currentWeight });
    }

    estimated.push({ date, weight: roundWeight(currentWeight) });

    const currentFloor = Math.floor(currentWeight);
    if (journey.targetWeight < journey.startWeight && currentFloor < lastMilestone) {
      for (let kg = lastMilestone - 1; kg >= currentFloor; kg -= 1) milestones.push({ date, weight: kg });
      lastMilestone = currentFloor;
    } else if (journey.targetWeight > journey.startWeight && currentFloor > lastMilestone) {
      for (let kg = lastMilestone + 1; kg <= currentFloor; kg += 1) milestones.push({ date, weight: kg });
      lastMilestone = currentFloor;
    }

    if (i === estimateDays) break;

    const day = normalizeDay(records[date]);
    const intake = getDayFoodCalories(day);
    const exercise = Number(day.exerciseCalories) || 0;
    const hasLoggedEnergy = intake > 0 || exercise > 0;

    // Không tự đoán thay đổi cân ở ngày người dùng không ghi gì.
    if (hasLoggedEnergy) {
      const maintenance = calculateMaintenanceCalories(profile, currentWeight);
      const deficit = maintenance + exercise - intake;
      currentWeight -= deficit / KCAL_PER_KG_APPROX;
    }
  }

  if (includeFuturePlan) {
    for (let i = 0; i <= totalDays; i += 1) {
      const date = shiftDateKey(journey.startDate, i);
      const ratio = i / totalDays;
      const weight = Number(journey.startWeight) + ((Number(journey.targetWeight) - Number(journey.startWeight)) * ratio);
      planned.push({ date, weight: roundWeight(weight) });
    }
  }

  return { profile, journey, estimated, planned, checkinPoints, milestones };
}

export function getEstimatedWeightForDate(dateKey) {
  const simulation = simulateJourney({ throughDate: dateKey, includeFuturePlan: false });
  if (!simulation || simulation.estimated.length === 0) return null;
  return simulation.estimated[simulation.estimated.length - 1].weight;
}

export function getCalorieTargetsForDate(dateKey) {
  const profile = getProfile();
  const journey = getJourney();
  if (!profile || !journey) return null;

  const currentWeight = getEstimatedWeightForDate(dateKey) ?? Number(journey.startWeight);
  return calculatePlannedTargetCalories({
    profile,
    currentWeight,
    targetWeight: Number(journey.targetWeight),
    currentDate: dateKey,
    endDate: journey.endDate,
    daysBetween
  });
}

function roundWeight(value) {
  return Math.round(value * 100) / 100;
}
