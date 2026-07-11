import { localDateKey, shiftDateKey } from '../core/02-date.js';
import {
  MEALS,
  addFood,
  deriveFoodSuggestions,
  getDayRecord,
  getDayFoodCalories,
  getMealCalories,
  saveDayRecord
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

function render() {
  const day = getDayRecord(selectedDate);
  const foodCalories = getDayFoodCalories(day);
  const targets = getCalorieTargetsForDate(selectedDate);
  const target = targets?.targetCalories || 0;
  const remaining = target - foodCalories + day.exerciseCalories;

  setText('#summary-target', target ? Math.round(target) : '—');
  setText('#summary-food', Math.round(foodCalories));
  setText('#summary-burn', Math.round(day.exerciseCalories));
  setText('#summary-remaining', target ? Math.round(remaining) : '—');
  document.querySelector('#profile-hint').classList.toggle('hidden', Boolean(targets));

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
