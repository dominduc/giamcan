export const KEYS = Object.freeze({
  PROFILE: 'weightNote.profile.v1',
  JOURNEY: 'weightNote.journey.v1',
  DAILY_RECORDS: 'weightNote.dailyRecords.v1',
  WEEKLY_WEIGHTS: 'weightNote.weeklyWeights.v1',
  NOTE: 'weightNote.note.v1'
});

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : structuredClone(fallback);
  } catch (error) {
    console.error(`Không đọc được dữ liệu ${key}:`, error);
    return structuredClone(fallback);
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeKey(key) {
  localStorage.removeItem(key);
}
