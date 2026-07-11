import { localDateKey, shiftDateKey } from '../core/02-date.js';
import {
  MEALS,
  addFood,
  deriveFoodSuggestions,
  getDayRecord,
  getDayFoodCalories,
  getMealCalories,
  saveDayRecord,
  setDayConfirmed
} from '../core/03-records.js';
import { getCalorieTargetsForDate } from '../core/05-journey.js';

let selectedDate = localDateKey();
let todayKey = localDateKey();

const dateInput = document.querySelector('#date-picker');
const mealSections = [...document.querySelectorAll('[data-meal]')];

init();

function init() {
  dateInput.value = selectedDate;
  document.querySelector('[data-date-prev]').addEventListener('click', () => changeDate(-1));
  document.querySelector('[data-date-next]').addEventListener('click', () => changeDate(1));
  dateInput.addEventListener('change', () => {
    if (!dateInput.value) return;
    selectedDate = dateInput.value;
    render();
  });

  mealSections.forEach(section => setupMealEntry(section));
  setupExercise();
  setupWater();
  setupConfirmDay();
  render();

  setInterval(checkMidnightBoundary, 60000);
  window.addEventListener('storage', render);
}

function changeDate(direction) {
  selectedDate = shiftDateKey(selectedDate, direction);
  dateInput.value = selectedDate;
  render();
}

function setupMealEntry(section) {
  const meal = section.dataset.meal;
  const nameInput = section.querySelector('[data-food-name]');
  const calInput = section.querySelector('[data-food-calories]');
  const saveButton = section.querySelector('[data-save-food]');
  const suggestionBox = section.querySelector('[data-suggestions]');

  const save = () => {
    syncDateBeforeAction();
    const name = nameInput.value.trim();
    const calories = Number(calInput.value);
    if (!name || !Number.isFinite(calories) || calories < 0) {
      pulseInvalid(!name ? nameInput : calInput);
      return;
    }
    addFood(selectedDate, meal, name, calories);
    nameInput.value = '';
    calInput.value = '';
    suggestionBox.classList.add('hidden');
    render();
    nameInput.focus();
  };

  saveButton.addEventListener('click', save);
  calInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') save();
  });
  nameInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      calInput.focus();
    }
  });
  nameInput.addEventListener('input', () => renderSuggestions(nameInput, calInput, suggestionBox));
  nameInput.addEventListener('focus', () => renderSuggestions(nameInput, calInput, suggestionBox));
  document.addEventListener('click', event => {
    if (!section.contains(event.target)) suggestionBox.classList.add('hidden');
  });
}

function renderSuggestions(nameInput, calInput, box) {
  const suggestions = deriveFoodSuggestions(nameInput.value, 5);
  if (!suggestions.length) {
    box.innerHTML = '';
    box.classList.add('hidden');
    return;
  }

  box.innerHTML = suggestions.map((item, index) => `
    <button type="button" class="suggestion-item" data-suggestion-index="${index}">
      <span>${escapeHtml(item.name)}</span>
      <small>${Math.round(item.calories)} kcal</small>
    </button>
  `).join('');
  box.classList.remove('hidden');

  box.querySelectorAll('[data-suggestion-index]').forEach(button => {
    button.addEventListener('click', () => {
      const item = suggestions[Number(button.dataset.suggestionIndex)];
      nameInput.value = item.name;
      calInput.value = Math.round(item.calories);
      box.classList.add('hidden');
      calInput.focus();
      calInput.select();
    });
  });
}

function setupExercise() {
  const input = document.querySelector('#exercise-input');
  document.querySelector('#save-exercise').addEventListener('click', () => {
    syncDateBeforeAction();
    const calories = Number(input.value);
    if (!Number.isFinite(calories) || calories < 0) {
      pulseInvalid(input);
      return;
    }
    const day = getDayRecord(selectedDate);
    day.exerciseCalories = calories;
    day.confirmed = false;
    saveDayRecord(selectedDate, day);
    input.value = '';
    render();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') document.querySelector('#save-exercise').click();
  });
}

function setupWater() {
  document.querySelector('#water-minus').addEventListener('click', () => updateWater(-1));
  document.querySelector('#water-plus').addEventListener('click', () => updateWater(1));
}

function updateWater(change) {
  syncDateBeforeAction();
  const day = getDayRecord(selectedDate);
  day.waterCups = Math.max(0, day.waterCups + change);
  saveDayRecord(selectedDate, day);
  render();
}

function setupConfirmDay() {
  document.querySelector('#confirm-day-btn').addEventListener('click', () => {
    syncDateBeforeAction();
    if (selectedDate > localDateKey()) return;
    setDayConfirmed(selectedDate, true);
    render();
  });
}

function renderConfirmDay(day) {
  const button = document.querySelector('#confirm-day-btn');
  const label = document.querySelector('#confirm-day-btn-label');
  const status = document.querySelector('#confirm-day-status');
  const isFuture = selectedDate > localDateKey();

  if (isFuture) {
    button.disabled = true;
    label.textContent = 'Không thể xác nhận ngày trong tương lai';
    status.textContent = '';
    return;
  }

  if (day.confirmed) {
    button.disabled = true;
    label.textContent = 'Đã xác nhận ngày này';
    status.innerHTML = 'Ngày này đã được tính vào hành trình cân nặng. <button type="button" class="button ghost" id="undo-confirm-day" style="min-height:32px;padding:4px 10px;font-size:.76rem">Hủy xác nhận</button>';
    document.querySelector('#undo-confirm-day')?.addEventListener('click', () => {
      setDayConfirmed(selectedDate, false);
      render();
    });
    return;
  }

  button.disabled = false;
  label.textContent = 'Xác nhận không nạp thêm calo';
  status.textContent = 'Chưa xác nhận: ngày này chưa được tính vào hành trình cân nặng. Bấm khi bạn chắc chắn không ăn/tập thêm gì nữa.';
}

function render() {
  const day = getDayRecord(selectedDate);
  const foodCalories = getDayFoodCalories(day);
  const targets = getCalorieTargetsForDate(selectedDate);
  const hasActiveJourney = Boolean(targets);
  const target = hasActiveJourney ? targets.targetCalories : 0;
  const remaining = hasActiveJourney
    ? target - foodCalories + day.exerciseCalories
    : 0;

  // Trước ngày bắt đầu hành trình (hoặc khi chưa tạo mục tiêu),
  // bảng tổng quan không tham gia tính toán và phải hiển thị toàn bộ là 0.
  setText('#summary-target', hasActiveJourney ? Math.round(target) : 0);
  setText('#summary-food', hasActiveJourney ? Math.round(foodCalories) : 0);
  setText('#summary-burn', hasActiveJourney ? Math.round(day.exerciseCalories) : 0);
  setText('#summary-remaining', hasActiveJourney ? Math.round(remaining) : 0);
  document.querySelector('#profile-hint').classList.toggle('hidden', hasActiveJourney);
  renderConfirmDay(day);

  mealSections.forEach(section => {
    const meal = section.dataset.meal;
    const items = day.meals[meal];
    section.querySelector('[data-meal-total]').textContent = `${Math.round(getMealCalories(day, meal))} kcal`;
    const list = section.querySelector('[data-saved-lines]');
    list.innerHTML = items.length
      ? items.slice(-3).reverse().map(item => `
          <div class="saved-line">
            <span>${escapeHtml(item.name)}</span>
            <strong>${Math.round(item.calories)} kcal</strong>
          </div>
        `).join('')
      : '';
  });

  setText('#exercise-total', `${Math.round(day.exerciseCalories)} kcal`);
  setText('#water-cups', day.waterCups);
  setText('#water-ml', `${day.waterCups * 250} ml`);
}

function syncDateBeforeAction() {
  const newToday = localDateKey();
  if (selectedDate === todayKey && newToday !== todayKey) {
    selectedDate = newToday;
    dateInput.value = selectedDate;
  }
  todayKey = newToday;
}

function checkMidnightBoundary() {
  const newToday = localDateKey();
  if (newToday === todayKey) return;
  if (selectedDate === todayKey) {
    selectedDate = newToday;
    dateInput.value = selectedDate;
    render();
  }
  todayKey = newToday;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function pulseInvalid(element) {
  element.focus();
  element.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
    { duration: 220 }
  );
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}