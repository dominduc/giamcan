// ==========================================
// 1. BIẾN TOÀN CỤC
// ==========================================
let dailyData = { breakfast: [], lunch: [], snack: [], dinner: [] };
let currentEditingMeal = '';
let targetMacros = { protein: 0, fat: 0, carb: 0 }; 
let dailyTargetCal = 0; 
let dailyTargetWater = 0; 
let totalExerciseCal = 0;
let totalWaterMl = 0;
let currentDateString = ''; 

let weightGoal = {
    targetWeight: 0,
    startDate: '',
    endDate: '',
    weightPerWeek: 0
};
let weightChartInstance = null;
let macroChartInstance = null;

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

    // Tải dữ liệu
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

    if (!age || !height || !weight) { alert('Vui lòng nhập đầy đủ tuổi, chiều cao, cân nặng!'); return; }

    // LƯU THÔNG TIN CƠ BẢN VÀO LOCALSTORAGE ĐỂ F5 KHÔNG MẤT
    localStorage.setItem('myBasicInfo', JSON.stringify({ gender, age, height, weight }));

    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr += (gender === 'male') ? 5 : -161;
    let tdee = bmr * 1.2;

    // TÍNH TOÁN THAY ĐỔI CALO TĂNG/GIẢM CÂN DỰA TRÊN LỘ TRÌNH
    let dailyCalAdjustment = 0; 
    if (weightGoal && weightGoal.targetWeight > 0 && weightGoal.startDate && weightGoal.endDate) {
        const d1 = new Date(weightGoal.startDate);
        const d2 = new Date(weightGoal.endDate);
        const diffDays = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
            const totalDiff = weightGoal.targetWeight - weight; // Âm = Giảm cân, Dương = Tăng cân
            // 1kg thay đổi ~ 7700 kcal
            dailyCalAdjustment = (totalDiff * 7700) / diffDays;
        }
    }

    dailyTargetCal = tdee + dailyCalAdjustment;
    
    // Safety net: Không để calo quá thấp gây suy nhược
    if (gender === 'male' && dailyTargetCal < 1500 && dailyCalAdjustment < 0) dailyTargetCal = 1500;
    if (gender === 'female' && dailyTargetCal < 1200 && dailyCalAdjustment < 0) dailyTargetCal = 1200;

    dailyTargetWater = weight * 35;

    targetMacros.protein = Math.round((dailyTargetCal * 0.3) / 4);
    targetMacros.fat = Math.round((dailyTargetCal * 0.3) / 9);
    targetMacros.carb = Math.round((dailyTargetCal * 0.4) / 4);

    document.getElementById('target-protein-text').innerText = `/ ${targetMacros.protein}g`;
    document.getElementById('target-fat-text').innerText = `/ ${targetMacros.fat}g`;
    document.getElementById('target-carb-text').innerText = `/ ${targetMacros.carb}g`;

    const calDisplay = document.getElementById('target-cal-display');
    if (calDisplay) calDisplay.innerText = `${Math.round(dailyTargetCal)} kcal`;
    
    const waterDisplay = document.getElementById('target-water-display');
    if (waterDisplay) waterDisplay.innerText = `${Math.round(dailyTargetWater)} ml`;
    
    updateNutrition(); 
    updateTotalCalories();
    saveToLocalStorage();
    
    alert(`Đã cập nhật chỉ số!\nTDEE (Giữ cân): ${Math.round(tdee)} kcal.\nMục tiêu hàng ngày của bạn: ${Math.round(dailyTargetCal)} kcal.`);
}

function saveWeightGoal() {
    const targetW = parseFloat(document.getElementById('target-weight').value);
    const startD = document.getElementById('start-date').value;
    const endD = document.getElementById('end-date').value;
    const currentW = parseFloat(document.getElementById('user-weight').value);

    if (!targetW || !startD || !endD || !currentW) {
        alert("Vui lòng nhập cân nặng hiện tại (ở trên), cân nặng mục tiêu và ngày tháng!");
        return;
    }

    const d1 = new Date(startD);
    const d2 = new Date(endD);
    const diffDays = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
        alert("Ngày kết thúc phải sau ngày bắt đầu!");
        return;
    }

    const weeks = diffDays / 7;
    const totalDiff = targetW - currentW; // Âm = giảm, Dương = tăng
    
    weightGoal = {
        targetWeight: targetW,
        startDate: startD,
        endDate: endD,
        weightPerWeek: (Math.abs(totalDiff) / weeks).toFixed(2)
    };

    // Hiển thị tóm tắt thông minh tuỳ thuộc tăng hay giảm cân
    const goalSummary = document.getElementById('goal-summary');
    goalSummary.classList.remove('hidden');
    const isGain = totalDiff > 0;
    
    goalSummary.innerHTML = `
        <p class="text-sm text-blue-800">Mục tiêu: <b>${isGain ? 'Tăng' : 'Giảm'} ${Math.abs(totalDiff).toFixed(1)}</b> kg</p>
        <p class="text-sm text-blue-800">Tiến độ: <b>${weightGoal.weightPerWeek}</b> kg / tuần</p>
        <p class="text-sm text-blue-800 italic mt-1">Hệ thống đã tự điều chỉnh lại Calo hàng ngày!</p>
    `;

    document.getElementById('goal-settings').removeAttribute('open');
    localStorage.setItem('myWeightGoal', JSON.stringify(weightGoal));
    
    // Ép hệ thống tính lại calo theo mục tiêu mới
    calculateTargets();
    updateWeightChart(); 
}

function updateNutrition() {
    let totalPro = 0; let totalFat = 0; let totalCarb = 0;
    let totalFiber = 0; let totalVitC = 0; let totalOmega = 0; let totalCholesterol = 0;

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

    document.getElementById('total-protein').innerText = totalPro.toFixed(1) + 'g';
    document.getElementById('total-fat').innerText = totalFat.toFixed(1) + 'g';
    document.getElementById('total-carb').innerText = totalCarb.toFixed(1) + 'g';

    let proPercent = targetMacros.protein > 0 ? Math.min((totalPro / targetMacros.protein) * 100, 100) : 0;
    let fatPercent = targetMacros.fat > 0 ? Math.min((totalFat / targetMacros.fat) * 100, 100) : 0;
    let carbPercent = targetMacros.carb > 0 ? Math.min((totalCarb / targetMacros.carb) * 100, 100) : 0;

    document.getElementById('progress-protein').style.width = proPercent + '%';
    document.getElementById('progress-fat').style.width = fatPercent + '%';
    document.getElementById('progress-carb').style.width = carbPercent + '%';

    const TARGET_FIBER = 25; 
    const TARGET_VITC = 90; 
    const TARGET_OMEGA = 1.6; 
    const MAX_CHOLESTEROL = 300; 

    document.getElementById('total-fiber').innerText = totalFiber.toFixed(1) + 'g';
    document.getElementById('progress-fiber').style.width = Math.min((totalFiber / TARGET_FIBER) * 100, 100) + '%';
    document.getElementById('total-vitC').innerText = totalVitC.toFixed(1) + 'mg';
    document.getElementById('progress-vitC').style.width = Math.min((totalVitC / TARGET_VITC) * 100, 100) + '%';
    document.getElementById('total-omega').innerText = totalOmega.toFixed(1) + 'g';
    document.getElementById('progress-omega').style.width = Math.min((totalOmega / TARGET_OMEGA) * 100, 100) + '%';
    document.getElementById('total-cholesterol').innerText = totalCholesterol.toFixed(1) + 'mg';
    
    let cholPercent = Math.min((totalCholesterol / MAX_CHOLESTEROL) * 100, 100);
    document.getElementById('progress-cholesterol').style.width = cholPercent + '%';
    
    if (totalCholesterol > MAX_CHOLESTEROL) {
        document.getElementById('total-cholesterol').style.color = 'red';
        document.getElementById('total-cholesterol').style.fontWeight = 'bold';
    } else {
        document.getElementById('total-cholesterol').style.color = '#333';
        document.getElementById('total-cholesterol').style.fontWeight = 'normal';
    }

    const ctx = document.getElementById('macroChart');
    if (ctx) {
        if (macroChartInstance) macroChartInstance.destroy();
        
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
// 7. LƯU TRỮ LOCAL STORAGE 
// ==========================================
function saveToLocalStorage() {
    const profileData = { 
        targetMacros: targetMacros, 
        dailyTargetCal: dailyTargetCal,
        dailyTargetWater: dailyTargetWater 
    };
    localStorage.setItem('myFitnessProfile', JSON.stringify(profileData));
    
    let allHistory = JSON.parse(localStorage.getItem('myFitnessHistory')) || {};
    allHistory[currentDateString] = { 
        dailyData: dailyData, 
        totalExerciseCal: totalExerciseCal, 
        totalWaterMl: totalWaterMl 
    };
    localStorage.setItem('myFitnessHistory', JSON.stringify(allHistory));
}

function loadFromLocalStorage() {
    // 1. Phục hồi thông số cơ thể ra các ô nhập (QUAN TRỌNG ĐỂ TRÁNH MẤT DỮ LIỆU)
    const savedBasic = localStorage.getItem('myBasicInfo');
    if (savedBasic) {
        const basicInfo = JSON.parse(savedBasic);
        if (document.getElementById('user-gender')) document.getElementById('user-gender').value = basicInfo.gender || 'male';
        if (document.getElementById('user-age')) document.getElementById('user-age').value = basicInfo.age || '';
        if (document.getElementById('user-height')) document.getElementById('user-height').value = basicInfo.height || '';
        if (document.getElementById('user-weight')) document.getElementById('user-weight').value = basicInfo.weight || '';
    }

    // 2. Tải Profile & Mục tiêu Calo
    const savedProfile = localStorage.getItem('myFitnessProfile');
    if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        targetMacros = parsed.targetMacros || { protein: 0, fat: 0, carb: 0 };
        dailyTargetCal = parsed.dailyTargetCal || 0;
        dailyTargetWater = parsed.dailyTargetWater || 0;
        
        const proText = document.getElementById('target-protein-text');
        const fatText = document.getElementById('target-fat-text');
        const carbText = document.getElementById('target-carb-text');

        if (dailyTargetCal > 0) {
            if (proText) proText.innerText = `/ ${targetMacros.protein}g`;
            if (fatText) fatText.innerText = `/ ${targetMacros.fat}g`;
            if (carbText) carbText.innerText = `/ ${targetMacros.carb}g`;
        }
    }

    // 3. Tải lộ trình giảm/tăng cân
    const savedGoal = localStorage.getItem('myWeightGoal');
    const goalSummary = document.getElementById('goal-summary');
    if (savedGoal && goalSummary) {
        weightGoal = JSON.parse(savedGoal);
        goalSummary.classList.remove('hidden');
        
        const currentWeight = parseFloat(document.getElementById('user-weight').value) || 0;
        if(currentWeight > 0) {
            const totalDiff = weightGoal.targetWeight - currentWeight;
            const isGain = totalDiff > 0;
            goalSummary.innerHTML = `
                <p class="text-sm text-blue-800">Mục tiêu: <b>${isGain ? 'Tăng' : 'Giảm'} ${Math.abs(totalDiff).toFixed(1)}</b> kg</p>
                <p class="text-sm text-blue-800">Tiến độ: <b>${weightGoal.weightPerWeek}</b> kg / tuần</p>
                <p class="text-sm text-blue-800 italic mt-1">Đường kẻ mục tiêu trên biểu đồ đã được cập nhật!</p>
            `;
        }
        
        // Gắn lại vào ô nhập liệu
        if(document.getElementById('target-weight')) document.getElementById('target-weight').value = weightGoal.targetWeight || '';
        if(document.getElementById('start-date')) document.getElementById('start-date').value = weightGoal.startDate || '';
        if(document.getElementById('end-date')) document.getElementById('end-date').value = weightGoal.endDate || '';
    }

    // 4. Tải Dữ liệu ăn uống/tập luyện của ngày hiện tại
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

    // 5. Render lại toàn bộ giao diện
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
    // Kiểm tra xem đã đến lúc cần cập nhật cân nặng chưa
    checkWeightReminder();
}

// Biểu đồ cân nặng
function updateWeightChart() {
    const ctx = document.getElementById('weightChart');
    if (!ctx || !weightGoal.startDate || !weightGoal.endDate) return;

    let labels = [];
    let targetData = [];
    let actualData = [];

    let start = new Date(weightGoal.startDate);
    let end = new Date(weightGoal.endDate);
    let currentWeight = parseFloat(document.getElementById('user-weight').value) || 0;
    let targetWeight = weightGoal.targetWeight;

    let totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) return;

    // Tính mức thay đổi mỗi ngày (Dùng cho cả tăng và giảm)
    let weightChangePerDay = (targetWeight - currentWeight) / totalDays;

    let runningActualWeight = currentWeight;

    for (let i = 0; i <= totalDays; i++) {
        let d = new Date(start);
        d.setDate(d.getDate() + i);
        let dateStr = d.toISOString().split('T')[0];

        labels.push(i % 7 === 0 ? `Tuần ${i/7}` : dateStr.split('-').slice(1).join('/'));

        // Mục tiêu chạy tuyến tính từ Cân hiện tại -> Cân mục tiêu
        targetData.push((currentWeight + (i * weightChangePerDay)).toFixed(2));

        let allHistory = JSON.parse(localStorage.getItem('myFitnessHistory')) || {};
        if (allHistory[dateStr]) {
            let dayData = allHistory[dateStr];
            let foodCal = 0;
            for (let meal in dayData.dailyData) {
                foodCal += dayData.dailyData[meal].reduce((sum, item) => sum + item.calories, 0);
            }
            
            // TDEE = Tổng tiêu hao (Không cộng trừ mục tiêu).
            let dailyTDEE = (dailyTargetCal > 0) ? (dailyTargetCal - (dailyTargetCal - Math.round(dailyTargetCal))) : 2000; // Ước tính nếu lỗi
            
            let netCal = foodCal - (dailyTDEE + dayData.totalExerciseCal);
            let weightChange = netCal / 7700; // Thâm hụt = âm, Thặng dư = dương
            runningActualWeight += weightChange;
            actualData.push(runningActualWeight.toFixed(2));
        } else {
            actualData.push(i === 0 ? currentWeight : null); 
        }
    }

    if (weightChartInstance) weightChartInstance.destroy();

    weightChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Mục tiêu',
                    data: targetData,
                    borderColor: '#94a3b8',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Thực tế',
                    data: actualData,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.3,
                    spanGaps: true 
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

// ==========================================
// 8. RESET DỮ LIỆU CÁ NHÂN
// ==========================================
function resetAllData() {
    const confirmReset = confirm("CẢNH BÁO: Bạn có chắc chắn muốn xoá TOÀN BỘ dữ liệu không?\n\nHành động này sẽ xoá sạch hồ sơ, mục tiêu và toàn bộ lịch sử ghi chép. KHÔNG THỂ HOÀN TÁC!");
    
    if (confirmReset) {
        localStorage.removeItem('myFitnessProfile');
        localStorage.removeItem('myFitnessHistory');
        localStorage.removeItem('myWeightGoal');
        localStorage.removeItem('myBasicInfo'); // Xoá thêm biến này

        dailyData = { breakfast: [], lunch: [], snack: [], dinner: [] };
        targetMacros = { protein: 0, fat: 0, carb: 0 }; 
        dailyTargetCal = 0; 
        dailyTargetWater = 0; 
        totalExerciseCal = 0;
        totalWaterMl = 0;
        weightGoal = { targetWeight: 0, startDate: '', endDate: '', weightPerWeek: 0 };

        alert("Đã dọn dẹp sạch sẽ toàn bộ dữ liệu! Ứng dụng sẽ tự động tải lại.");
        location.reload(); 
    }
}

// ==========================================
// 9. CHỨC NĂNG ZOOM BIỂU ĐỒ
// ==========================================
function zoomChart(level) {
    const wrapper = document.getElementById('chart-wrapper');
    const scrollBox = document.getElementById('chart-scroll-box');
    
    wrapper.style.width = (level * 100) + '%';
    
    if (weightChartInstance) {
        weightChartInstance.resize();
    }

    setTimeout(() => {
        scrollBox.scrollLeft = scrollBox.scrollWidth;
    }, 300); 
}
// ==========================================
// 10. CHECK-IN CÂN NẶNG HÀNG TUẦN
// ==========================================
function updateWeeklyWeight() {
    const newWeight = parseFloat(document.getElementById('weekly-weight-input').value);
    
    if (!newWeight || newWeight <= 0) {
        alert("Vui lòng nhập số cân nặng hợp lệ!");
        return;
    }

    // 1. Ghi đè số cân mới vào ô cân nặng gốc trong hồ sơ
    const mainWeightInput = document.getElementById('user-weight');
    if (mainWeightInput) {
        mainWeightInput.value = newWeight;
    }

    // 2. Lưu lại ngày check-in để đếm 7 ngày cho tuần sau
    let todayDate = new Date().toISOString().split('T')[0];
    localStorage.setItem('lastWeighInDate', todayDate);

    // 3. Gọi hàm calculateTargets() để tính lại Calo
    calculateTargets();

    // ==========================================
    // 3.5 LƯU LỊCH SỬ ĐỂ VẼ BIỂU ĐỒ
    // ==========================================
    let weightHistory = JSON.parse(localStorage.getItem('myWeightHistory')) || [];
    
    weightHistory.push({
        date: todayDate,
        weight: newWeight
    });
    
    localStorage.setItem('myWeightHistory', JSON.stringify(weightHistory));

    // ĐÃ SỬA THÀNH ĐÚNG TÊN HÀM TRONG CODE CỦA BẠN:
    if (typeof updateWeightChart === "function") {
        updateWeightChart(); 
    }
    // ==========================================

    // 4. Xoá ô nhập và ẩn cảnh báo nhắc nhở
    document.getElementById('weekly-weight-input').value = '';
    const msgEl = document.getElementById('weight-reminder-msg');
    if (msgEl) msgEl.classList.add('hidden');

    alert(`Tuyệt vời! Đã cập nhật cân nặng thành ${newWeight}kg.\n\nHệ thống đã tự động tính lại Calo và cập nhật biểu đồ!`);
}

function checkWeightReminder() {
    // Đã xoá dòng bị lỗi tự động set lại ngày hôm nay
    const savedDateStr = localStorage.getItem('lastWeighInDate');
    
    // Đọc ngày lưu, nếu chưa có thì gán ngày hôm nay
    let lastDateObj;
    if (savedDateStr) {
        lastDateObj = new Date(savedDateStr);
    } else {
        lastDateObj = new Date();
        localStorage.setItem('lastWeighInDate', lastDateObj.toISOString().split('T')[0]);
    }

    // Tính khoảng cách ngày
    const today = new Date();
    const diffTime = Math.abs(today - lastDateObj);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Nếu qua 7 ngày thì hiện thông báo nhắc
    if (diffDays >= 7) {
        const msgEl = document.getElementById('weight-reminder-msg');
        if (msgEl) {
            msgEl.innerText = `Đã ${diffDays} ngày kể từ lần cuối bạn cập nhật cân nặng. Cân lại để app chỉnh Calo cho chuẩn nhé!`;
            msgEl.classList.remove('hidden');
        }
    }
}