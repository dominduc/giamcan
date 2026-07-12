import { clearAppData } from '../core/01-storage.js';
import { localDateKey, daysBetween, formatDateVi, shiftDateKey } from '../core/02-date.js';
import { getDayFoodCalories, getDayRecord } from '../core/03-records.js';
import { ACTIVITY_LEVELS, calculateBmr, calculateMaintenanceCalories } from '../core/04-calculations.js';
import {
  deleteWeeklyWeight,
  getCalorieTargetsForDate,
  getJourney,
  getProfile,
  getWeeklyWeights,
  saveProfileAndJourney,
  saveWeeklyWeight,
  simulateJourney
} from '../core/05-journey.js';

let zoomLevel = 1;

const formCard = document.querySelector('#profile-form-card');
const dashboard = document.querySelector('#profile-dashboard');
const form = document.querySelector('#profile-form');

init();

function init() {
  populateActivityOptions();
  form.addEventListener('submit', saveProfile);
  document.querySelector('#save-checkin').addEventListener('click', saveCheckin);
  document.querySelector('#reset-journey').addEventListener('click', resetJourney);
  document.querySelectorAll('[data-zoom]').forEach(button => {
    button.addEventListener('click', () => {
      zoomLevel = Number(button.dataset.zoom);
      renderChart();
      document.querySelectorAll('[data-zoom]').forEach(btn => btn.classList.toggle('active', btn === button));
    });
  });

  document.querySelector('#checkin-date').value = localDateKey();
  render();
  window.addEventListener('storage', render);
}

function populateActivityOptions() {
  const select = document.querySelector('#activity-level');
  select.innerHTML = Object.entries(ACTIVITY_LEVELS)
    .map(([value, info]) => `<option value="${value}">${info.label}</option>`)
    .join('');
}

function saveProfile(event) {
  event.preventDefault();
  const data = new FormData(form);
  const profile = {
    gender: data.get('gender'),
    age: Number(data.get('age')),
    heightCm: Number(data.get('heightCm')),
    activityLevel: data.get('activityLevel')
  };
  const journey = {
    startWeight: Number(data.get('startWeight')),
    targetWeight: Number(data.get('targetWeight')),
    startDate: data.get('startDate'),
    endDate: data.get('endDate'),
    createdAt: Date.now()
  };

  const message = validateProfile(profile, journey);
  if (message) {
    showFormMessage(message);
    return;
  }

  try {
    saveProfileAndJourney(profile, journey);
    document.querySelector('#profile-form-message').classList.add('hidden');
    formCard.hidden = true;
    render();
  } catch (error) {
    showFormMessage(error.message);
  }
}

function validateProfile(profile, journey) {
  if (!profile.age || !profile.heightCm || !journey.startWeight || !journey.targetWeight) return 'Vui lòng nhập đủ thông tin.';
  if (profile.age < 15 || profile.age > 100) return 'Tuổi cần nằm trong khoảng 15–100.';
  if (profile.heightCm < 100 || profile.heightCm > 250) return 'Chiều cao chưa hợp lệ.';
  if (journey.startWeight <= 0 || journey.targetWeight <= 0) return 'Cân nặng phải lớn hơn 0.';
  if (!journey.startDate || !journey.endDate || daysBetween(journey.startDate, journey.endDate) <= 0) return 'Ngày kết thúc phải sau ngày bắt đầu.';
  return '';
}

function showFormMessage(message) {
  const element = document.querySelector('#profile-form-message');
  element.textContent = message;
  element.classList.remove('hidden');
}

function saveCheckin() {
  const date = document.querySelector('#checkin-date').value;
  const weight = Number(document.querySelector('#checkin-weight').value);
  const message = document.querySelector('#checkin-message');
  message.classList.add('hidden');

  if (!date || !weight || weight <= 0) {
    message.textContent = 'Nhập ngày và cân nặng hợp lệ.';
    message.classList.remove('hidden');
    return;
  }

  try {
    saveWeeklyWeight(date, weight);
    document.querySelector('#checkin-weight').value = '';
    render();
  } catch (error) {
    message.textContent = error.message;
    message.classList.remove('hidden');
  }
}

function resetJourney() {
  const confirmed = confirm(
    'Xóa TOÀN BỘ dữ liệu của Weight Note trên máy này?\n\nHồ sơ, hành trình, nhật ký ăn uống, lịch sử món ăn đề xuất, tập thể dục, nước, cân nặng thực tế và ghi chú đều sẽ bị xóa. Không thể hoàn tác.'
  );
  if (!confirmed) return;

  clearAppData();
  zoomLevel = 1;
  form.reset();
  document.querySelectorAll('[data-zoom]').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.zoom) === 1);
  });
  setDefaultDates();
  render();
}

function render() {
  const profile = getProfile();
  const journey = getJourney();
  const hasJourney = Boolean(profile && journey);
  const isPartial = Boolean(profile) !== Boolean(journey);

  dashboard.classList.toggle('hidden', !hasJourney);
  formCard.hidden = hasJourney;
  document.querySelector('#profile-recovery-note').classList.toggle('hidden', !isPartial);

  if (!hasJourney) {
    setDefaultDates();
    return;
  }

  renderSummary(profile, journey);
  renderCheckins(journey);
  renderChart();
}

function setDefaultDates() {
  if (!form.elements.startDate.value) form.elements.startDate.value = localDateKey();
  if (!form.elements.endDate.value) form.elements.endDate.value = shiftDateKey(localDateKey(), 180);
}

function renderSummary(profile, journey) {
  const simulation = simulateJourney();
  const lastPoint = simulation.estimated.at(-1);
  const currentWeight = lastPoint?.weight ?? journey.startWeight;
  const maintenance = calculateMaintenanceCalories(profile, currentWeight);
  const targets = getCalorieTargetsForDate(localDateKey());
  const elapsedDays = Math.max(0, daysBetween(journey.startDate, localDateKey()));
  const totalDays = Math.max(1, daysBetween(journey.startDate, journey.endDate));

  setText('#current-weight', `${currentWeight.toFixed(1)} kg`);
  setText('#maintenance-calories', `${Math.round(maintenance)} kcal`);
  setText('#target-calories', targets ? `${Math.round(targets.targetCalories)} kcal` : '—');
  setText('#journey-progress', `${Math.min(elapsedDays, totalDays)} / ${totalDays} ngày`);
  setText('#journey-route', `${journey.startWeight} kg → ${journey.targetWeight} kg`);
  setText('#journey-dates', `${formatDateVi(journey.startDate)} → ${formatDateVi(journey.endDate)}`);

  const caution = document.querySelector('#target-caution');
  caution.classList.toggle('hidden', !targets?.softFloorApplied);
}

function renderCheckins(journey) {
  const list = document.querySelector('#checkin-history');
  const weights = getWeeklyWeights();
  document.querySelector('#checkin-date').min = shiftDateKey(journey.startDate, 1);
  document.querySelector('#checkin-date').max = journey.endDate;

  list.innerHTML = weights.length
    ? weights.slice().reverse().map(item => `
      <div class="checkin-item" data-checkin-date="${item.date}">
        <span><strong>${item.weight} kg</strong> · ${formatDateVi(item.date)}</span>
        <button type="button" class="button ghost" data-delete-checkin>Gỡ mốc</button>
      </div>
    `).join('')
    : '<div class="empty-state">Chưa có mốc cân thực tế. Cân nặng ban đầu vẫn luôn được giữ nguyên; mỗi mốc mới chỉ ghi đè ước tính đúng tại ngày bạn nhập và làm điểm neo cho các ngày sau.</div>';

  list.querySelectorAll('[data-delete-checkin]').forEach(button => {
    button.addEventListener('click', () => {
      const date = button.closest('[data-checkin-date]').dataset.checkinDate;
      deleteWeeklyWeight(date);
      render();
    });
  });
}

function renderChart() {
  const journey = getJourney();
  if (!journey) return;
  // Không giới hạn ở "hôm nay": nếu đã nhập mốc cân thật cho ngày tương lai
  // (ví dụ khi đang test biểu đồ), đường ước tính vẫn cần phản ánh ngay,
  // không phải chờ tới đúng ngày đó mới hiện.
  const simulation = simulateJourney({ throughDate: journey.endDate, capToToday: false });
  if (!simulation) return;

  const { planned, estimated, checkinPoints, milestones } = simulation;
  const svg = document.querySelector('#weight-chart');
  const totalDays = Math.max(1, daysBetween(journey.startDate, journey.endDate));
  const width = Math.max(720, totalDays * 3) * zoomLevel;
  const height = 330;
  const margin = { left: 56, right: 28, top: 30, bottom: 48 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const allWeights = [...planned, ...estimated, ...checkinPoints].map(point => Number(point.weight));
  const minWeight = Math.floor(Math.min(...allWeights) - 1);
  const maxWeight = Math.ceil(Math.max(...allWeights) + 1);
  const yRange = Math.max(1, maxWeight - minWeight);
  const yStep = yRange > 20 ? 2 : 1;

  const x = date => margin.left + (daysBetween(journey.startDate, date) / totalDays) * plotWidth;
  const y = weight => margin.top + ((maxWeight - weight) / yRange) * plotHeight;

  const planPath = pathFromPoints(planned, x, y);
  const estimatePath = stepPathFromPoints(estimated, x, y);
  const gridY = [];
  for (let kg = Math.ceil(minWeight / yStep) * yStep; kg <= maxWeight; kg += yStep) gridY.push(kg);

  const tickEvery = totalDays <= 120 ? 7 : totalDays <= 260 ? 14 : 30;
  const xTicks = [];
  for (let day = 0; day <= totalDays; day += tickEvery) xTicks.push(day);
  if (xTicks.at(-1) !== totalDays) xTicks.push(totalDays);

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.width = `${width}px`;
  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#fffdf8" rx="12" />
    ${gridY.map(kg => `
      <line x1="${margin.left}" y1="${y(kg)}" x2="${width - margin.right}" y2="${y(kg)}" stroke="#d7d0c1" stroke-dasharray="4 6" />
      <text x="${margin.left - 10}" y="${y(kg) + 4}" text-anchor="end" font-size="11" fill="#64675f">${kg}kg</text>
    `).join('')}
    ${xTicks.map(day => {
      const date = shiftDateKey(journey.startDate, day);
      return `
        <line x1="${x(date)}" y1="${margin.top}" x2="${x(date)}" y2="${height - margin.bottom}" stroke="#eee9df" />
        <text x="${x(date)}" y="${height - 22}" text-anchor="middle" font-size="10" fill="#64675f">${day === 0 ? '0' : day}</text>
      `;
    }).join('')}
    <text x="${width - margin.right}" y="${height - 7}" text-anchor="end" font-size="11" font-weight="700" fill="#64675f">ngày</text>
    <path d="${planPath}" fill="none" stroke="#9d9483" stroke-width="2" stroke-dasharray="7 7" vector-effect="non-scaling-stroke" />
    <path d="${estimatePath}" fill="none" stroke="#6f8777" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
    ${milestones.map(point => `
      <circle cx="${x(point.date)}" cy="${y(point.weight)}" r="4" fill="#d6a84d" stroke="#20231f" stroke-width="1" />
      <text x="${x(point.date) + 7}" y="${y(point.weight) - 7}" font-size="10" font-weight="800" fill="#8a651f">${point.weight}kg</text>
    `).join('')}
    ${checkinPoints.map(point => `
      <circle cx="${x(point.date)}" cy="${y(point.weight)}" r="6" fill="#d97b68" stroke="#20231f" stroke-width="1.5" />
      <title>Cân thật ${point.weight} kg · ${formatDateVi(point.date)}</title>
    `).join('')}
    ${estimated.map((point, index) => `
      <circle class="chart-hit" data-index="${index}" cx="${x(point.date)}" cy="${y(point.weight)}" r="8" fill="transparent" />
    `).join('')}
  `;

  svg.querySelectorAll('.chart-hit').forEach(hit => {
    hit.addEventListener('click', () => renderChartDetail(estimated[Number(hit.dataset.index)]));
  });

  renderChartDetail(estimated.at(-1));
}

function renderChartDetail(point) {
  if (!point) return;
  const day = getDayRecord(point.date);
  const intake = getDayFoodCalories(day);
  // Dùng đúng con số duy trì đã được mô phỏng lưu lại cho ngày này (tính từ
  // cân đầu ngày), không tính lại từ point.weight — vì nếu hôm đó vừa đủ
  // mốc 1kg, point.weight vẫn là cân đầu ngày, còn tính lại có thể vô tình
  // lệch nếu logic sau này đổi. Lấy thẳng từ nguồn duy nhất tránh sai số.
  const maintenance = point.maintenance;
  const deficit = day.confirmed
    ? maintenance + day.exerciseCalories - intake
    : 0;

  document.querySelector('#chart-detail').innerHTML = `
    <strong>${formatDateVi(point.date)} · ${point.weight.toFixed(2)} kg</strong><br>
    Nạp ${Math.round(intake)} kcal · Duy trì ước tính ${Math.round(maintenance)} kcal · Thể dục ${Math.round(day.exerciseCalories)} kcal
    ${day.confirmed ? `· Chênh lệch ${deficit >= 0 ? '-' : '+'}${Math.abs(Math.round(deficit))} kcal` : '· Ngày này chưa xác nhận nên chưa được tính vào hành trình'}
  `;
}

function pathFromPoints(points, x, y) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.date).toFixed(2)} ${y(point.weight).toFixed(2)}`).join(' ');
}

// Đường cân ước tính vẫn đi theo bậc (đứng yên cho tới khi đủ 1 kg hoặc có
// cân thật, rồi mới nhảy sang mốc mới) nhưng góc chuyển bậc được bo tròn nhẹ
// để bớt cảm giác biến động gấp, thay vì góc vuông 90 độ.
function stepPathFromPoints(points, x, y, radius = 7) {
  if (!points.length) return '';

  // Dữ liệu gốc có một điểm mỗi ngày; chỉ giữ lại các điểm cân THẬT SỰ đổi
  // để xác định vị trí các góc bậc thang cần bo tròn.
  const corners = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    if (points[index].weight !== points[index - 1].weight) corners.push(points[index]);
  }
  const lastPoint = points[points.length - 1];
  if (corners[corners.length - 1] !== lastPoint) corners.push(lastPoint);

  if (corners.length === 1) {
    return `M ${x(corners[0].date).toFixed(2)} ${y(corners[0].weight).toFixed(2)}`;
  }

  let path = `M ${x(corners[0].date).toFixed(2)} ${y(corners[0].weight).toFixed(2)}`;

  for (let index = 1; index < corners.length; index += 1) {
    const prev = corners[index - 1];
    const curr = corners[index];
    const xJump = x(curr.date);
    const xPrev = x(prev.date);
    const yLevel = y(prev.weight);
    const yNext = y(curr.weight);
    const jumpHeight = Math.abs(yNext - yLevel);

    if (jumpHeight < 0.5) {
      path += ` L ${xJump.toFixed(2)} ${yLevel.toFixed(2)}`;
      continue;
    }

    const r = Math.min(radius, (xJump - xPrev) / 2, jumpHeight / 2);
    const verticalSign = yNext > yLevel ? 1 : -1;
    const isLastCorner = index === corners.length - 1;

    path += ` L ${(xJump - r).toFixed(2)} ${yLevel.toFixed(2)}`;
    path += ` Q ${xJump.toFixed(2)} ${yLevel.toFixed(2)} ${xJump.toFixed(2)} ${(yLevel + r * verticalSign).toFixed(2)}`;

    if (isLastCorner) {
      path += ` L ${xJump.toFixed(2)} ${yNext.toFixed(2)}`;
    } else {
      path += ` L ${xJump.toFixed(2)} ${(yNext - r * verticalSign).toFixed(2)}`;
      path += ` Q ${xJump.toFixed(2)} ${yNext.toFixed(2)} ${(xJump + r).toFixed(2)} ${yNext.toFixed(2)}`;
    }
  }

  return path;
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}