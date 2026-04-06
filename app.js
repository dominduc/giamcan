// ==========================================
// 1. BIẾN TOÀN CỤC
// ==========================================
let dailyData = { breakfast: [], lunch: [], snack: [], dinner: [] };
let currentEditingMeal = '';
let targetMacros = { protein: 0, fat: 0, carb: 0 }; 
let dailyTargetCal = 0; 
let dailyTargetWater = 0; // Thêm biến này để lưu mục tiêu nước
let totalExerciseCal = 0;
let totalWaterMl = 0;
let currentDateString = ''; // Lưu ngày đang xem


// ==========================================   
// 2. KHỞI TẠO & QUẢN LÝ NGÀY THÁNG
// ==========================================
window.onload = function() {
    // Tải danh sách thức ăn
    const select = document.getElementById('food-select');
    foodDatabase.forEach(food => {
        let option = document.createElement('option');
        option.value = food.id;
        option.text = `${food.name} (${food.calPer100g} kcal/100g)`;
        select.appendChild(option);
    });

    // Lấy ngày hôm nay (Chuẩn múi giờ)
    let today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    currentDateString = today.toISOString().split('T')[0]; 
    
    // Gắn vào thanh Lịch
    document.getElementById('date-picker').value = currentDateString;

    // Tải dữ liệu của ngày hôm nay
    loadFromLocalStorage();
};

function changeDate(days) {
    let dateObj = new Date(currentDateString);
    dateObj.setDate(dateObj.getDate() + days);
    currentDateString = dateObj.toISOString().split('T')[0];
    document.getElementById('date-picker').value = currentDateString;
    loadFromLocalStorage(); 
}

function selectDate(newDate) {
    if (!newDate) return;
    currentDateString = newDate;
    loadFromLocalStorage(); 
}

// ==========================================
// 3. CHUYỂN TRANG
// ==========================================
function switchPage(pageId, btnElement) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
        page.classList.add('hidden');
    });

    const btns = document.querySelectorAll('.nav-btn');
    btns.forEach(btn => {
        btn.classList.remove('active-btn');
    });

    document.getElementById(pageId).classList.remove('hidden');
    document.getElementById(pageId).classList.add('active');
    btnElement.classList.add('active-btn');
    if (pageId === 'personal-page') {
        updateWeightChart();
    }
}

// ==========================================
// 4. QUẢN LÝ THỨC ĂN
// ==========================================
function openFoodModal(mealType) {
    currentEditingMeal = mealType;
    document.getElementById('food-modal').classList.remove('hidden');
    const mealNames = { breakfast: 'Bữa sáng', lunch: 'Bữa trưa', snack: 'Bữa phụ', dinner: 'Bữa tối' };
    document.getElementById('modal-title').innerText = `Thêm món cho ${mealNames[mealType]}`;
    renderModalList();
}

function closeModal() {
    document.getElementById('food-modal').classList.add('hidden');
    document.getElementById('food-gram').value = '';
}

function addFoodToMeal() {
    const foodId = document.getElementById('food-select').value;
    const grams = parseFloat(document.getElementById('food-gram').value);

    if (!grams || grams <= 0) {
        alert('Vui lòng nhập số gram hợp lệ!');
        return;
    }

    const foodItem = foodDatabase.find(f => f.id === foodId);
    const calculatedCal = (grams / 100) * foodItem.calPer100g;

    dailyData[currentEditingMeal].push({
        id: Date.now(),
        name: foodItem.name,
        grams: grams,
        calories: calculatedCal
    });

    document.getElementById('food-gram').value = '';
    renderModalList();
}

function renderModalList() {
    const ul = document.getElementById('current-meal-items');
    ul.innerHTML = '';
    dailyData[currentEditingMeal].forEach(item => {
        let li = document.createElement('li');
        li.innerHTML = `<span>${item.name} (${item.grams}g)</span> 
                        <span><b>${Math.round(item.calories)} kcal</b> 
                        <span class="delete-item" onclick="removeFood(${item.id})">&times;</span></span>`;
        ul.appendChild(li);
    });
}

function removeFood(itemId) {
    dailyData[currentEditingMeal] = dailyData[currentEditingMeal].filter(item => item.id !== itemId);
    renderModalList();
    
    // Cập nhật giao diện bên ngoài
    const totalMealCal = dailyData[currentEditingMeal].reduce((sum, item) => sum + item.calories, 0);
    document.getElementById(`${currentEditingMeal}-cal`).innerText = `${Math.round(totalMealCal)} kcal`;
    
    updateTotalCalories();
    updateNutrition(); 
    saveToLocalStorage();
}

function saveMeal() {
    const totalMealCal = dailyData[currentEditingMeal].reduce((sum, item) => sum + item.calories, 0);
    document.getElementById(`${currentEditingMeal}-cal`).innerText = `${Math.round(totalMealCal)} kcal`;
    
    updateTotalCalories();
    updateNutrition(); 
    closeModal();
    saveToLocalStorage();
}

// Bảng Tóm Tắt Calo
function updateTotalCalories() {
    let foodTotal = 0;
    
    for (let meal in dailyData) {
        foodTotal += dailyData[meal].reduce((sum, item) => sum + item.calories, 0);
    }
    
    let remainingCal = dailyTargetCal - foodTotal + totalExerciseCal;

    document.getElementById('summary-target').innerText = Math.round(dailyTargetCal);
    document.getElementById('summary-food').innerText = Math.round(foodTotal);
    document.getElementById('summary-burn').innerText = Math.round(totalExerciseCal);
    document.getElementById('summary-remaining').innerText = Math.round(remainingCal);
    
    if (remainingCal < 0) {
        document.getElementById('summary-remaining').style.color = '#e53935';
    } else {
        document.getElementById('summary-remaining').style.color = '#4caf50';
    }
}

// ==========================================
// 5. QUẢN LÝ THỂ DỤC & NƯỚC
// ==========================================
function openExerciseModal() { document.getElementById('exercise-modal').classList.remove('hidden'); }
function closeExerciseModal() { document.getElementById('exercise-modal').classList.add('hidden'); }

function saveExercise() {
    const calPerMinute = parseFloat(document.getElementById('exercise-select').value);
    const minutes = parseFloat(document.getElementById('exercise-time').value);
    
    if (!minutes || minutes <= 0) { alert('Vui lòng nhập số phút!'); return; }
    
    const burned = calPerMinute * minutes;
    totalExerciseCal += burned;
    
    document.getElementById('exercise-cal').innerText = `${Math.round(totalExerciseCal)} kcal`;
    document.getElementById('exercise-time').value = '';
    updateTotalCalories();
    closeExerciseModal();
    saveToLocalStorage();
}

function openWaterModal() { document.getElementById('water-modal').classList.remove('hidden'); }
function closeWaterModal() { document.getElementById('water-modal').classList.add('hidden'); }

function addWater(ml) {
    totalWaterMl += ml;
    updateWaterDisplay();
    closeWaterModal();
    saveToLocalStorage();
}

function saveCustomWater() {
    const ml = parseFloat(document.getElementById('water-ml-input').value);
    if (!ml || ml <= 0) return;
    totalWaterMl += ml;
    updateWaterDisplay();
    document.getElementById('water-ml-input').value = '';
    closeWaterModal();
    saveToLocalStorage();
}

function updateWaterDisplay() {
    document.getElementById('water-ml').innerText = `${totalWaterMl} ml`;
}

// ==========================================
// 6. TÍNH TOÁN MỤC TIÊU & DINH DƯỠNG
// ==========================================
function calculateTargets() {
    const gender = document.getElementById('user-gender').value;
    const age = parseFloat(document.getElementById('user-age').value);
    const height = parseFloat(document.getElementById('user-height').value);
    const weight = parseFloat(document.getElementById('user-weight').value);

    if (!age || !height || !weight) { alert('Vui lòng nhập đầy đủ thông tin!'); return; }

    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr += (gender === 'male') ? 5 : -161;

    let tdee = bmr * 1.2;
    dailyTargetCal = tdee - 500;
    dailyTargetWater = weight * 35; // Tính mục tiêu nước

    targetMacros.protein = Math.round((dailyTargetCal * 0.3) / 4);
    targetMacros.fat = Math.round((dailyTargetCal * 0.3) / 9);
    targetMacros.carb = Math.round((dailyTargetCal * 0.4) / 4);

    document.getElementById('target-protein-text').innerText = `/ ${targetMacros.protein}g`;
    document.getElementById('target-fat-text').innerText = `/ ${targetMacros.fat}g`;
    document.getElementById('target-carb-text').innerText = `/ ${targetMacros.carb}g`;

    document.getElementById('target-cal-display').innerText = `${Math.round(dailyTargetCal)} kcal`;
    document.getElementById('target-water-display').innerText = `${Math.round(dailyTargetWater)} ml`;
    
    updateNutrition(); 
    updateTotalCalories();
    saveToLocalStorage();
    alert('Đã tạo thành công mục tiêu dành riêng cho bạn!');
}

// Khai báo biến biểu đồ (để trống ở ngoài cùng, trên phần TÍNH TOÁN)
let macroChartInstance = null;

function updateNutrition() {
    let totalPro = 0; let totalFat = 0; let totalCarb = 0;
    // Khởi tạo biến cho vi chất
    let totalFiber = 0; let totalVitC = 0; let totalOmega = 0; let totalCholesterol = 0;

    // Tính tổng tất cả các chất từ các bữa ăn
    for (let meal in dailyData) {
        dailyData[meal].forEach(item => {
            const foodInfo = foodDatabase.find(f => f.name === item.name);
            if (foodInfo) {
                const ratio = item.grams / 100;
                totalPro += ratio * foodInfo.protein;
                totalFat += ratio * foodInfo.fat;
                totalCarb += ratio * foodInfo.carb;
                
                totalFiber += ratio * (foodInfo.fiber || 0);
                totalVitC += ratio * (foodInfo.vitC || 0);
                totalOmega += ratio * (foodInfo.omega3 || 0);
                totalCholesterol += ratio * (foodInfo.cholesterol || 0);
            }
        });
    }

    // 1. Cập nhật Đa lượng (Macros)
    document.getElementById('total-protein').innerText = totalPro.toFixed(1) + 'g';
    document.getElementById('total-fat').innerText = totalFat.toFixed(1) + 'g';
    document.getElementById('total-carb').innerText = totalCarb.toFixed(1) + 'g';

    let proPercent = targetMacros.protein > 0 ? Math.min((totalPro / targetMacros.protein) * 100, 100) : 0;
    let fatPercent = targetMacros.fat > 0 ? Math.min((totalFat / targetMacros.fat) * 100, 100) : 0;
    let carbPercent = targetMacros.carb > 0 ? Math.min((totalCarb / targetMacros.carb) * 100, 100) : 0;

    document.getElementById('progress-protein').style.width = proPercent + '%';
    document.getElementById('progress-fat').style.width = fatPercent + '%';
    document.getElementById('progress-carb').style.width = carbPercent + '%';

    // 2. Cập nhật Vi lượng (Micros) với mục tiêu mặc định chuẩn Y tế
    const TARGET_FIBER = 25; // 25g
    const TARGET_VITC = 90; // 90mg
    const TARGET_OMEGA = 1.6; // 1.6g
    const MAX_CHOLESTEROL = 300; // 300mg (Tối đa)

    document.getElementById('total-fiber').innerText = totalFiber.toFixed(1) + 'g';
    document.getElementById('progress-fiber').style.width = Math.min((totalFiber / TARGET_FIBER) * 100, 100) + '%';

    document.getElementById('total-vitC').innerText = totalVitC.toFixed(1) + 'mg';
    document.getElementById('progress-vitC').style.width = Math.min((totalVitC / TARGET_VITC) * 100, 100) + '%';

    document.getElementById('total-omega').innerText = totalOmega.toFixed(1) + 'g';
    document.getElementById('progress-omega').style.width = Math.min((totalOmega / TARGET_OMEGA) * 100, 100) + '%';

    document.getElementById('total-cholesterol').innerText = totalCholesterol.toFixed(1) + 'mg';
    let cholPercent = Math.min((totalCholesterol / MAX_CHOLESTEROL) * 100, 100);
    document.getElementById('progress-cholesterol').style.width = cholPercent + '%';
    
    // Cảnh báo Cholesterol (Nếu vượt 300mg sẽ đổi màu đỏ gắt)
    if (totalCholesterol > MAX_CHOLESTEROL) {
        document.getElementById('total-cholesterol').style.color = 'red';
        document.getElementById('total-cholesterol').style.fontWeight = 'bold';
    } else {
        document.getElementById('total-cholesterol').style.color = '#333';
        document.getElementById('total-cholesterol').style.fontWeight = 'normal';
    }

    // 3. Vẽ Biểu đồ Tròn (Doughnut Chart)
    const ctx = document.getElementById('macroChart');
    if (ctx) { // Đảm bảo thẻ canvas tồn tại
        if (macroChartInstance) {
            macroChartInstance.destroy(); // Xóa biểu đồ cũ để vẽ cái mới
        }
        
        // Chỉ vẽ khi có dữ liệu ăn uống (Tổng > 0)
        if (totalPro > 0 || totalFat > 0 || totalCarb > 0) {
            macroChartInstance = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Protein', 'Fat', 'Carb'],
                    datasets: [{
                        data: [totalPro.toFixed(1), totalFat.toFixed(1), totalCarb.toFixed(1)],
                        backgroundColor: ['#e53935', '#fb8c00', '#43a047'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
    }
}

// ==========================================
// 7. LƯU TRỮ LOCAL STORAGE (THEO NGÀY)
// ==========================================
function saveToLocalStorage() {
    // 1. Lưu Profile (Không bị ảnh hưởng khi đổi ngày)
    const profileData = { 
        targetMacros: targetMacros, 
        dailyTargetCal: dailyTargetCal,
        dailyTargetWater: dailyTargetWater 
    };
    localStorage.setItem('myFitnessProfile', JSON.stringify(profileData));
    
    // 2. Lưu Lịch sử theo ngày đang chọn
    let allHistory = JSON.parse(localStorage.getItem('myFitnessHistory')) || {};
    allHistory[currentDateString] = { 
        dailyData: dailyData, 
        totalExerciseCal: totalExerciseCal, 
        totalWaterMl: totalWaterMl 
    };
    localStorage.setItem('myFitnessHistory', JSON.stringify(allHistory));
}

function loadFromLocalStorage() {
    // 1. Tải Profile & Mục tiêu
    const savedProfile = localStorage.getItem('myFitnessProfile');
    if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        targetMacros = parsed.targetMacros || { protein: 0, fat: 0, carb: 0 };
        dailyTargetCal = parsed.dailyTargetCal || 0;
        dailyTargetWater = parsed.dailyTargetWater || 0;
        
        // Kiểm tra xem các thẻ hiển thị mục tiêu có tồn tại trên trang hiện tại không
        const calDisp = document.getElementById('target-cal-display');
        const waterDisp = document.getElementById('target-water-display');
        const proText = document.getElementById('target-protein-text');
        const fatText = document.getElementById('target-fat-text');
        const carbText = document.getElementById('target-carb-text');

        if (dailyTargetCal > 0) {
            if (calDisp) calDisp.innerText = `${Math.round(dailyTargetCal)} kcal`;
            if (waterDisp) waterDisp.innerText = `${Math.round(dailyTargetWater)} ml`; 
            if (proText) proText.innerText = `/ ${targetMacros.protein}g`;
            if (fatText) fatText.innerText = `/ ${targetMacros.fat}g`;
            if (carbText) carbText.innerText = `/ ${targetMacros.carb}g`;
        }
    }

    // 2. Tải lộ trình giảm cân (Mục tiêu cân nặng mới thêm)
    const savedGoal = localStorage.getItem('myWeightGoal');
    const goalSummary = document.getElementById('goal-summary');
    if (savedGoal && goalSummary) {
        weightGoal = JSON.parse(savedGoal);
        goalSummary.classList.remove('hidden');
        
        const weightToLoseEl = document.getElementById('weight-to-lose');
        const weightPerWeekEl = document.getElementById('weight-per-week');
        const userWeightEl = document.getElementById('user-weight');

        if (weightToLoseEl && userWeightEl && userWeightEl.value) {
             weightToLoseEl.innerText = (parseFloat(userWeightEl.value) - weightGoal.targetWeight).toFixed(1);
        }
        if (weightPerWeekEl) weightPerWeekEl.innerText = weightGoal.weightPerWeek;
    }

    // 3. Tải Dữ liệu của ngày hiện tại
    let allHistory = JSON.parse(localStorage.getItem('myFitnessHistory')) || {};
    let dayData = allHistory[currentDateString];

    if (dayData) {
        dailyData = dayData.dailyData || { breakfast: [], lunch: [], snack: [], dinner: [] };
        totalExerciseCal = dayData.totalExerciseCal || 0;
        totalWaterMl = dayData.totalWaterMl || 0;
    } else {
        dailyData = { breakfast: [], lunch: [], snack: [], dinner: [] };
        totalExerciseCal = 0;
        totalWaterMl = 0;
    }

    // 4. Render lại toàn bộ giao diện
    updateTotalCalories();
    updateNutrition();
    updateWaterDisplay();
    
    for (let meal in dailyData) {
        const mealEl = document.getElementById(`${meal}-cal`);
        if (mealEl) {
            const mealCal = dailyData[meal].reduce((sum, item) => sum + item.calories, 0);
            mealEl.innerText = `${Math.round(mealCal)} kcal`;
        }
    }

    const exCalEl = document.getElementById('exercise-cal');
    if (exCalEl) exCalEl.innerText = `${Math.round(totalExerciseCal)} kcal`;
}
// Thêm biến toàn cục mới
let weightGoal = {
    targetWeight: 0,
    startDate: '',
    endDate: '',
    weightPerWeek: 0
};
let weightChartInstance = null;

// Hàm lưu mục tiêu giảm cân
function saveWeightGoal() {
    const targetW = parseFloat(document.getElementById('target-weight').value);
    const startD = document.getElementById('start-date').value;
    const endD = document.getElementById('end-date').value;
    const currentW = parseFloat(document.getElementById('user-weight').value);

    if (!targetW || !startD || !endD || !currentW) {
        alert("Vui lòng nhập đầy đủ thông tin hồ sơ và mục tiêu!");
        return;
    }

    // Tính toán số tuần
    const d1 = new Date(startD);
    const d2 = new Date(endD);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = diffDays / 7;

    if (weeks <= 0) {
        alert("Ngày kết thúc phải sau ngày bắt đầu!");
        return;
    }

    const totalLoss = currentW - targetW;
    weightGoal = {
        targetWeight: targetW,
        startDate: startD,
        endDate: endD,
        weightPerWeek: (totalLoss / weeks).toFixed(2)
    };

    // Hiển thị tóm tắt
    document.getElementById('goal-summary').classList.remove('hidden');
    document.getElementById('weight-to-lose').innerText = totalLoss.toFixed(1);
    document.getElementById('weight-per-week').innerText = weightGoal.weightPerWeek;

    // Đóng phần nhập liệu lại cho gọn
    document.getElementById('goal-settings').removeAttribute('open');

    // Lưu vào LocalStorage
    localStorage.setItem('myWeightGoal', JSON.stringify(weightGoal));
    
    alert("Đã lưu mục tiêu! Hãy tiếp tục ghi chép ăn uống hàng ngày để cập nhật biểu đồ.");
    
    // Ở bước sau chúng ta sẽ viết hàm vẽ biểu đồ tại đây
    localStorage.setItem('myWeightGoal', JSON.stringify(weightGoal));
    
    // THÊM DÒNG NÀY VÀO CUỐI HÀM
    updateWeightChart(); 
    
    alert("Đã lưu mục tiêu và cập nhật biểu đồ!");
}

// Cập nhật lại hàm loadFromLocalStorage để lấy lại mục tiêu đã lưu
// (Bạn hãy tìm hàm loadFromLocalStorage cũ và thêm đoạn này vào cuối)
function loadWeightGoal() {
    const savedGoal = localStorage.getItem('myWeightGoal');
    if (savedGoal) {
        weightGoal = JSON.parse(savedGoal);
        document.getElementById('goal-summary').classList.remove('hidden');
        document.getElementById('weight-to-lose').innerText = (parseFloat(document.getElementById('user-weight').value) - weightGoal.targetWeight).toFixed(1);
        document.getElementById('weight-per-week').innerText = weightGoal.weightPerWeek;
    }
}
function updateWeightChart() {
    const ctx = document.getElementById('weightChart');
    if (!ctx || !weightGoal.startDate || !weightGoal.endDate) return;

    // 1. Tạo danh sách các ngày từ ngày bắt đầu đến ngày kết thúc
    let labels = [];
    let targetData = [];
    let actualData = [];

    let start = new Date(weightGoal.startDate);
    let end = new Date(weightGoal.endDate);
    let currentWeight = parseFloat(document.getElementById('user-weight').value) || 0;
    let targetWeight = weightGoal.targetWeight;

    // Tính tổng số ngày trong lộ trình
    let totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) return;

    // Tính mức giảm cân cần thiết mỗi ngày (Lý thuyết)
    let weightLossPerDay = (currentWeight - targetWeight) / totalDays;

    // 2. Chuẩn bị dữ liệu cho từng ngày
    let runningActualWeight = currentWeight;

    for (let i = 0; i <= totalDays; i++) {
        let d = new Date(start);
        d.setDate(d.getDate() + i);
        let dateStr = d.toISOString().split('T')[0];

        // Nhãn trục hoành (In đậm mốc đầu tuần)
        labels.push(i % 7 === 0 ? `Tuần ${i/7}` : dateStr.split('-').slice(1).join('/'));

        // Dữ liệu đường MỤC TIÊU (Giảm đều mỗi ngày)
        targetData.push((currentWeight - (i * weightLossPerDay)).toFixed(2));

        // Dữ liệu đường THỰC TẾ (Dựa trên lịch sử ăn uống)
        let allHistory = JSON.parse(localStorage.getItem('myFitnessHistory')) || {};
        if (allHistory[dateStr]) {
            let dayData = allHistory[dateStr];
            let foodCal = 0;
            for (let meal in dayData.dailyData) {
                foodCal += dayData.dailyData[meal].reduce((sum, item) => sum + item.calories, 0);
            }
            // Logic: Thâm hụt 7700 calo = giảm 1kg. TDEE giả định lấy từ dailyTargetCal + 500 (vì target thường là TDEE - 500)
            let dailyTDEE = dailyTargetCal + 500; 
            let netCal = foodCal - (dailyTDEE + dayData.totalExerciseCal);
            let weightChange = netCal / 7700;
            runningActualWeight += weightChange;
            actualData.push(runningActualWeight.toFixed(2));
        } else {
            // Nếu chưa đến ngày đó hoặc không có dữ liệu, để null để đường biểu đồ không bị rớt xuống 0
            actualData.push(i === 0 ? currentWeight : null); 
        }
    }

    // 3. Khởi tạo hoặc cập nhật Chart.js
    if (weightChartInstance) weightChartInstance.destroy();

    weightChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Mục tiêu (Lý thuyết)',
                    data: targetData,
                    borderColor: '#94a3b8', // Màu xám
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Thực tế (Dựa trên ăn uống)',
                    data: actualData,
                    borderColor: '#22c55e', // Màu xanh lá
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.3,
                    spanGaps: true // Nối các điểm kể cả khi có ngày trống
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: false,
                    title: { display: true, text: 'Cân nặng (kg)' }
                }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}
// 8. RESET DỮ LIỆU CÁ NHÂN
// ==========================================
function resetAllData() {
    // 1. Hiển thị hộp thoại cảnh báo (Xác nhận 2 lớp để tránh bấm nhầm)
    const confirmReset = confirm("CẢNH BÁO: Bạn có chắc chắn muốn xoá TOÀN BỘ dữ liệu không?\n\nHành động này sẽ xoá sạch hồ sơ, mục tiêu và toàn bộ lịch sử ghi chép. KHÔNG THỂ HOÀN TÁC!");
    
    if (confirmReset) {
        // 2. Xoá toàn bộ các "hộp" lưu trữ của app trong LocalStorage
        localStorage.removeItem('myFitnessProfile');
        localStorage.removeItem('myFitnessHistory');
        localStorage.removeItem('myWeightGoal');

        // 3. Reset các biến toàn cục về số 0
        dailyData = { breakfast: [], lunch: [], snack: [], dinner: [] };
        targetMacros = { protein: 0, fat: 0, carb: 0 }; 
        dailyTargetCal = 0; 
        dailyTargetWater = 0; 
        totalExerciseCal = 0;
        totalWaterMl = 0;
        weightGoal = { targetWeight: 0, startDate: '', endDate: '', weightPerWeek: 0 };

        // 4. Thông báo và Tải lại trang web (Reload) để làm trắng toàn bộ giao diện
        alert("Đã dọn dẹp sạch sẽ toàn bộ dữ liệu! Ứng dụng sẽ tự động tải lại.");
        location.reload(); // F5 lại trang bằng code
    }
}
// ==========================================
// 9. CHỨC NĂNG ZOOM BIỂU ĐỒ
// ==========================================
function zoomChart(level) {
    const wrapper = document.getElementById('chart-wrapper');
    const scrollBox = document.getElementById('chart-scroll-box');
    
    // 1. Phóng to độ rộng của khung chứa (1x = 100%, 2x = 200%, 3x = 300%)
    wrapper.style.width = (level * 100) + '%';
    
    // 2. Ép Chart.js vẽ lại theo kích thước mới
    if (weightChartInstance) {
        weightChartInstance.resize();
    }

    // 3. Tự động cuộn mượt mà sang bên phải (để hiển thị những ngày gần nhất)
    setTimeout(() => {
        scrollBox.scrollLeft = scrollBox.scrollWidth;
    }, 300); // Chờ 300ms cho CSS bung kích thước xong mới cuộn
}