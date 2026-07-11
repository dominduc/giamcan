import { localDateKey, shiftDateKey } from '../core/02-date.js';
import {
  MEALS,
  deleteFood,
  getDayFoodCalories,
  getDayRecord,
  listFoodMemory,
  updateFood
} from '../core/03-records.js';
import { getCalorieTargetsForDate } from '../core/05-journey.js';

let selectedDate = localDateKey();
let editing = null;

const dateInput = document.querySelector('#date-picker');
const tbody = document.querySelector('#food-table-body');

init();

function init() {
  dateInput.value = selectedDate;
  document.querySelector('[data-date-prev]').addEventListener('click', () => changeDate(-1));
  document.querySelector('[data-date-next]').addEventListener('click', () => changeDate(1));
  dateInput.addEventListener('change', () => {
    if (!dateInput.value) return;
    selectedDate = dateInput.value;
    editing = null;
    render();
  });
  render();
  window.addEventListener('storage', render);
}

function changeDate(direction) {
  selectedDate = shiftDateKey(selectedDate, direction);
  dateInput.value = selectedDate;
  editing = null;
  render();
}

function render() {
  const day = getDayRecord(selectedDate);
  const items = [];
  for (const [meal, label] of Object.entries(MEALS)) {
    day.meals[meal].forEach(item => items.push({ ...item, meal, mealLabel: label }));
  }

  tbody.innerHTML = items.length ? items.map(renderRow).join('') : `
    <tr><td colspan="4"><div class="empty-state">Ngày này chưa có món ăn nào.</div></td></tr>
  `;

  bindRows();
  renderSummary(day);
  renderMemory();
}

function renderRow(item) {
  const isEditing = editing?.id === item.id && editing?.meal === item.meal;
  return `
    <tr data-row data-id="${item.id}" data-meal="${item.meal}">
      <td><span class="meal-tag meal-tag--${item.meal}">${item.mealLabel}</span></td>
      <td>${isEditing
        ? `<input class="edit-row-input" data-edit-name value="${escapeHtml(item.name)}">`
        : escapeHtml(item.name)}</td>
      <td class="num">${isEditing
        ? `<input class="edit-row-input" data-edit-cal type="number" min="0" step="1" value="${Number(item.calories)}">`
        : `${Math.round(item.calories)} kcal`}</td>
      <td>
        <div class="table-actions">
          ${isEditing
            ? `<button type="button" data-save-edit title="Lưu"><svg class="icon"><use href="assets/icons.svg#check"></use></svg></button>`
            : `<button type="button" data-edit title="Sửa"><svg class="icon"><use href="assets/icons.svg#edit"></use></svg></button>`}
          <button type="button" data-delete title="Xóa"><svg class="icon"><use href="assets/icons.svg#trash"></use></svg></button>
        </div>
      </td>
    </tr>
  `;
}

function bindRows() {
  tbody.querySelectorAll('[data-row]').forEach(row => {
    const id = row.dataset.id;
    const meal = row.dataset.meal;
    row.querySelector('[data-edit]')?.addEventListener('click', () => {
      editing = { id, meal };
      render();
      row.querySelector('[data-edit-name]')?.focus();
    });
    row.querySelector('[data-save-edit]')?.addEventListener('click', () => {
      const name = row.querySelector('[data-edit-name]').value.trim();
      const calories = Number(row.querySelector('[data-edit-cal]').value);
      if (!name || !Number.isFinite(calories) || calories < 0) return;
      updateFood(selectedDate, meal, id, { name, calories });
      editing = null;
      render();
    });
    row.querySelector('[data-delete]')?.addEventListener('click', () => {
      if (!confirm('Xóa món này khỏi nhật ký?')) return;
      deleteFood(selectedDate, meal, id);
      if (editing?.id === id) editing = null;
      render();
    });
  });
}

function renderSummary(day) {
  const targetInfo = getCalorieTargetsForDate(selectedDate);
  const hasActiveJourney = Boolean(targetInfo);

  // Trước ngày bắt đầu hành trình (hoặc khi chưa tạo mục tiêu),
  // dữ liệu món ăn vẫn được giữ để làm lịch sử/gợi ý nhưng KHÔNG tham gia bảng tính.
  if (!hasActiveJourney) {
    setText('#sum-target', '0 kcal');
    setText('#sum-food', '0 kcal');
    setText('#sum-exercise', '0 kcal');
    setText('#sum-remaining', '0 kcal');
    return;
  }

  const food = getDayFoodCalories(day);
  const target = targetInfo.targetCalories;
  const remaining = target - food + day.exerciseCalories;

  setText('#sum-target', `${Math.round(target)} kcal`);
  setText('#sum-food', `${Math.round(food)} kcal`);
  setText('#sum-exercise', `${Math.round(day.exerciseCalories)} kcal`);
  setText('#sum-remaining', `${Math.round(remaining)} kcal`);
}

function renderMemory() {
  const items = listFoodMemory(24);
  const container = document.querySelector('#food-memory');
  container.innerHTML = items.length
    ? items.map(item => `<span class="history-hint">${escapeHtml(item.name)} · ${item.count} lần</span>`).join('')
    : '<div class="empty-state">Chưa có lịch sử để đề xuất. Món đã xóa hết khỏi nhật ký sẽ tự biến mất khỏi danh sách này.</div>';
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

