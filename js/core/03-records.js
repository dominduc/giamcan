import { KEYS, readJson, writeJson } from './01-storage.js';

export const MEALS = Object.freeze({
  breakfast: 'Bữa sáng',
  lunch: 'Bữa trưa',
  snack: 'Bữa chiều / phụ',
  dinner: 'Bữa tối'
});

export function emptyDayRecord() {
  return {
    meals: {
      breakfast: [],
      lunch: [],
      snack: [],
      dinner: []
    },
    exerciseCalories: 0,
    waterCups: 0,
    updatedAt: Date.now()
  };
}

export function getAllRecords() {
  return readJson(KEYS.DAILY_RECORDS, {});
}

export function saveAllRecords(records) {
  writeJson(KEYS.DAILY_RECORDS, records);
}

export function getDayRecord(dateKey) {
  const records = getAllRecords();
  return records[dateKey] ? normalizeDay(records[dateKey]) : emptyDayRecord();
}

export function saveDayRecord(dateKey, dayRecord) {
  const records = getAllRecords();
  records[dateKey] = normalizeDay({ ...dayRecord, updatedAt: Date.now() });
  saveAllRecords(records);
  return records[dateKey];
}

export function normalizeDay(day) {
  const base = emptyDayRecord();
  const meals = day?.meals || {};
  for (const meal of Object.keys(MEALS)) {
    base.meals[meal] = Array.isArray(meals[meal]) ? meals[meal] : [];
  }
  base.exerciseCalories = Math.max(0, Number(day?.exerciseCalories) || 0);
  base.waterCups = Math.max(0, Math.round(Number(day?.waterCups) || 0));
  base.updatedAt = Number(day?.updatedAt) || Date.now();
  return base;
}

export function addFood(dateKey, meal, name, calories) {
  const day = getDayRecord(dateKey);
  const item = {
    id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    calories: Math.round(Number(calories) * 10) / 10,
    createdAt: Date.now()
  };
  day.meals[meal].push(item);
  saveDayRecord(dateKey, day);
  return item;
}

export function updateFood(dateKey, meal, itemId, patch) {
  const day = getDayRecord(dateKey);
  const item = day.meals[meal].find(entry => entry.id === itemId);
  if (!item) return false;
  if (typeof patch.name === 'string' && patch.name.trim()) item.name = patch.name.trim();
  if (Number.isFinite(Number(patch.calories)) && Number(patch.calories) >= 0) {
    item.calories = Math.round(Number(patch.calories) * 10) / 10;
  }
  saveDayRecord(dateKey, day);
  return true;
}

export function deleteFood(dateKey, meal, itemId) {
  const day = getDayRecord(dateKey);
  const before = day.meals[meal].length;
  day.meals[meal] = day.meals[meal].filter(entry => entry.id !== itemId);
  if (day.meals[meal].length === before) return false;
  saveDayRecord(dateKey, day);
  return true;
}

export function getDayFoodCalories(day) {
  return Object.values(day.meals).flat().reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
}

export function getMealCalories(day, meal) {
  return day.meals[meal].reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
}

export function deriveFoodSuggestions(query = '', limit = 6) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const records = getAllRecords();
  const memory = new Map();

  Object.entries(records).forEach(([dateKey, dayRaw]) => {
    const day = normalizeDay(dayRaw);
    Object.values(day.meals).flat().forEach(item => {
      const normalizedName = normalizeText(item.name);
      if (!normalizedName) return;
      const current = memory.get(normalizedName) || {
        name: item.name,
        calories: Number(item.calories) || 0,
        count: 0,
        latestDate: dateKey,
        latestCreatedAt: 0
      };
      current.count += 1;
      const createdAt = Number(item.createdAt) || 0;
      if (dateKey > current.latestDate || createdAt >= current.latestCreatedAt) {
        current.name = item.name;
        current.calories = Number(item.calories) || 0;
        current.latestDate = dateKey;
        current.latestCreatedAt = createdAt;
      }
      memory.set(normalizedName, current);
    });
  });

  return [...memory.entries()]
    .filter(([normalizedName]) => normalizedName.includes(normalizedQuery))
    .map(([, value]) => value)
    .sort((a, b) => {
      const aStarts = normalizeText(a.name).startsWith(normalizedQuery) ? 1 : 0;
      const bStarts = normalizeText(b.name).startsWith(normalizedQuery) ? 1 : 0;
      return bStarts - aStarts || b.count - a.count || b.latestDate.localeCompare(a.latestDate);
    })
    .slice(0, limit);
}

export function listFoodMemory(limit = 20) {
  const records = getAllRecords();
  const counts = new Map();
  Object.values(records).forEach(dayRaw => {
    const day = normalizeDay(dayRaw);
    Object.values(day.meals).flat().forEach(item => {
      const key = normalizeText(item.name);
      if (!key) return;
      const current = counts.get(key) || { name: item.name, count: 0 };
      current.count += 1;
      current.name = item.name;
      counts.set(key, current);
    });
  });
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi')).slice(0, limit);
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
