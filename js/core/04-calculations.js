export const KCAL_PER_KG_APPROX = 7700;

export const ACTIVITY_LEVELS = Object.freeze({
  student_sedentary: {
    factor: 1.20,
    label: 'Đi học / ngồi nhiều, vận động rất ít'
  },
  office_light: {
    factor: 1.30,
    label: 'Đi làm / ngồi nhiều, có đi lại nhẹ'
  },
  active_work: {
    factor: 1.45,
    label: 'Công việc vận động vừa'
  },
  heavy_work: {
    factor: 1.60,
    label: 'Công việc vận động nhiều'
  }
});

export function calculateBmr({ gender, age, heightCm, weightKg }) {
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return gender === 'female' ? base - 161 : base + 5;
}

export function calculateMaintenanceCalories(profile, weightKg) {
  const bmr = calculateBmr({
    gender: profile.gender,
    age: Number(profile.age),
    heightCm: Number(profile.heightCm),
    weightKg: Number(weightKg)
  });
  const factor = ACTIVITY_LEVELS[profile.activityLevel]?.factor || 1.20;
  return bmr * factor;
}

export function calculatePlannedTargetCalories({ profile, currentWeight, targetWeight, currentDate, endDate, daysBetween }) {
  const maintenance = calculateMaintenanceCalories(profile, currentWeight);
  const remainingDays = Math.max(1, daysBetween(currentDate, endDate));
  const requiredBalance = ((targetWeight - currentWeight) * KCAL_PER_KG_APPROX) / remainingDays;
  const rawTarget = maintenance + requiredBalance;

  // Chỉ là hàng rào kỹ thuật cho app ghi chép, không phải đơn thuốc dinh dưỡng.
  const softFloor = profile.gender === 'female' ? 1200 : 1500;
  const targetCalories = targetWeight < currentWeight ? Math.max(softFloor, rawTarget) : rawTarget;

  return {
    maintenance,
    targetCalories,
    rawTarget,
    requiredDailyBalance: requiredBalance,
    softFloorApplied: targetCalories !== rawTarget
  };
}
