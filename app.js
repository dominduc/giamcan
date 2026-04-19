// ==========================================
// 1. BIẾN TOÀN CỤC
// ==========================================
let dailyData = { breakfast: [], lunch: [], snack: [], dinner: [] };
let currentEditingMeal = '';
let targetMacros = { protein: 0, fat: 0, carb: 0 }; 
let dailyTargetCal = 0; 
let baseTDEE = 0; // Thêm biến này để lưu TDEE giữ cân gốc
let dailyTargetWater = 0; 
let totalExerciseCal = 0;
let totalWaterMl = 0;
let currentDateString = ''; 

const CUSTOM_FOOD_STORAGE_KEY = 'myCustomFoods';

let weightGoal = {
    targetWeight: 0,
    startDate: '',
    endDate: '',
    weightPerWeek: 0
};
let weightChartInstance = null;
let macroChartInstance = null;
function getTodayLocalDateString() {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
}

function upsertWeightHistoryEntry(dateStr, weight) {
    let weightHistory = JSON.parse(localStorage.getItem('myWeightHistory')) || [];
    const numericWeight = parseFloat(weight);

    if (!dateStr || !numericWeight || numericWeight <= 0) return weightHistory;

    const existingIndex = weightHistory.findIndex(item => item.date === dateStr);
    if (existingIndex >= 0) {
        weightHistory[existingIndex].weight = numericWeight;
    } else {
        weightHistory.push({ date: dateStr, weight: numericWeight });
    }

    weightHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    localStorage.setItem('myWeightHistory', JSON.stringify(weightHistory));
    return weightHistory;
}


// ==========================================   
// 2. KHỞI TẠO & QUẢN LÝ NGÀY THÁNG
// ==========================================
window.onload = function() {
    loadCustomFoodsIntoDatabase();
    renderFoodOptions();

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
    // Ẩn tất cả trang
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.classList.add('hidden');
    });

    // Bỏ active ở tất cả nút
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-btn');
    });

    // Hiện trang được chọn
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('active');
    }

    // Tô active cho nút được bấm
    if (btnElement) {
        btnElement.classList.add('active-btn');
    }

    // Nếu vào trang cá nhân thì refresh các phần liên quan
    if (pageId === 'personal-page') {
        setTimeout(() => {
            if (typeof updateWeightChart === 'function') updateWeightChart();
            if (typeof renderHeatmap === 'function') renderHeatmap();
            if (typeof checkWeightReminder === 'function') checkWeightReminder();
        }, 50);
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
    
    // Thêm 2 dòng này để reset thanh tìm kiếm về như mới
    const searchInput = document.getElementById('food-search');
    if (searchInput) {
        searchInput.value = '';
        filterFood(); // Gọi lại hàm để load lại toàn bộ danh sách món
    }
}

function getStoredCustomFoods() {
    try {
        return JSON.parse(localStorage.getItem(CUSTOM_FOOD_STORAGE_KEY)) || [];
    } catch (error) {
        console.error('Không đọc được danh sách món ăn tự tạo:', error);
        return [];
    }
}

function saveStoredCustomFoods(customFoods) {
    localStorage.setItem(CUSTOM_FOOD_STORAGE_KEY, JSON.stringify(customFoods));
}

function loadCustomFoodsIntoDatabase() {
    const customFoods = getStoredCustomFoods();

    customFoods.forEach(food => {
        const existed = foodDatabase.some(item => item.id === food.id);
        if (!existed) {
            foodDatabase.push(food);
        }
    });
}

function renderFoodOptions(searchKeyword = '') {
    const select = document.getElementById('food-select');
    if (!select) return;

    const keyword = searchKeyword.trim().toLowerCase();
    const filteredFoods = foodDatabase.filter(food =>
        food.name.toLowerCase().includes(keyword)
    );

    select.innerHTML = '';

    if (filteredFoods.length === 0) {
        let option = document.createElement('option');
        option.text = 'Không tìm thấy món này...';
        option.disabled = true;
        select.appendChild(option);
        return;
    }

    filteredFoods.forEach(food => {
        let option = document.createElement('option');
        option.value = food.id;
        option.text = `${food.name} (${food.calPer100g} kcal/100g)`;
        select.appendChild(option);
    });
}

function openCustomFoodModal() {
    document.getElementById('custom-food-modal').classList.remove('hidden');
}

function closeCustomFoodModal() {
    document.getElementById('custom-food-modal').classList.add('hidden');

    [
        'custom-food-name',
        'custom-food-cal',
        'custom-food-protein',
        'custom-food-fat',
        'custom-food-carb',
        'custom-food-fiber',
        'custom-food-vitc',
        'custom-food-omega3',
        'custom-food-cholesterol'
    ].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
}

function getCustomFoodFormData() {
    return {
        name: document.getElementById('custom-food-name').value.trim(),
        calPer100g: parseFloat(document.getElementById('custom-food-cal').value),
        protein: parseFloat(document.getElementById('custom-food-protein').value) || 0,
        fat: parseFloat(document.getElementById('custom-food-fat').value) || 0,
        carb: parseFloat(document.getElementById('custom-food-carb').value) || 0,
        fiber: parseFloat(document.getElementById('custom-food-fiber').value) || 0,
        vitC: parseFloat(document.getElementById('custom-food-vitc').value) || 0,
        omega3: parseFloat(document.getElementById('custom-food-omega3').value) || 0,
        cholesterol: parseFloat(document.getElementById('custom-food-cholesterol').value) || 0
    };
}

function saveCustomFood() {
    const newFood = getCustomFoodFormData();

    if (!newFood.name) {
        alert('Vui lòng nhập tên món ăn!');
        return;
    }

    if (Number.isNaN(newFood.calPer100g) || newFood.calPer100g < 0) {
        alert('Vui lòng nhập calo/100g hợp lệ!');
        return;
    }

    const duplicatedName = foodDatabase.some(food =>
        food.name.trim().toLowerCase() === newFood.name.toLowerCase()
    );

    if (duplicatedName) {
        alert('Món ăn này đã có trong danh sách rồi!');
        return;
    }

    newFood.id = `custom_${Date.now()}`;

    const customFoods = getStoredCustomFoods();
    customFoods.push(newFood);
    saveStoredCustomFoods(customFoods);
    foodDatabase.push(newFood);

    const searchInput = document.getElementById('food-search');
    const currentKeyword = searchInput ? searchInput.value : '';
    renderFoodOptions(currentKeyword || newFood.name);

    const select = document.getElementById('food-select');
    if (select) {
        select.value = newFood.id;
    }

    closeCustomFoodModal();
    alert(`Đã thêm món mới: ${newFood.name}`);
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
function calculateTargets(showAlert = true) {
    const weight = parseFloat(document.getElementById('user-weight').value);
    const gender = document.getElementById('user-gender').value;
    const age = parseFloat(document.getElementById('user-age').value);
    const height = parseFloat(document.getElementById('user-height').value);
    
    if (!age || !height || !weight) return;
    localStorage.setItem('myBasicInfo', JSON.stringify({ gender, age, height, weight }));

    const todayStr = getTodayLocalDateString();

    // Nếu đang có lộ trình thì lưu cân nặng vào lịch sử TRƯỚC khi tính calo
    if (weightGoal && weightGoal.startDate && weightGoal.endDate) {
        upsertWeightHistoryEntry(todayStr, weight);
    }

    if (weightGoal && weightGoal.checkpoints) {
        let existing = weightGoal.checkpoints.find(c => c.date === todayStr);
        if (existing) existing.weight = weight;
        else weightGoal.checkpoints.push({ date: todayStr, weight: weight });
        
        weightGoal.checkpoints.sort((a,b) => new Date(a.date) - new Date(b.date));
        localStorage.setItem('myWeightGoal', JSON.stringify(weightGoal));
    }

    dailyTargetCal = getDynamicTargetForDate(currentDateString);
    dailyTargetWater = weight * 35;
    targetMacros.protein = Math.round((dailyTargetCal * 0.3) / 4);
    targetMacros.fat = Math.round((dailyTargetCal * 0.3) / 9);
    targetMacros.carb = Math.round((dailyTargetCal * 0.4) / 4);

    if (document.getElementById('target-protein-text')) {
        document.getElementById('target-protein-text').innerText = `/ ${targetMacros.protein}g`;
    }
    if (document.getElementById('target-fat-text')) {
        document.getElementById('target-fat-text').innerText = `/ ${targetMacros.fat}g`;
    }
    if (document.getElementById('target-carb-text')) {
        document.getElementById('target-carb-text').innerText = `/ ${targetMacros.carb}g`;
    }
    if (document.getElementById('target-cal-display')) {
        document.getElementById('target-cal-display').innerText = `${Math.round(dailyTargetCal)} kcal`;
    }
    
    if (typeof updateNutrition === 'function') updateNutrition(); 
    if (typeof updateTotalCalories === 'function') updateTotalCalories();
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    
    if (showAlert) {
        alert(`Đã cập nhật mục tiêu mới!\nMục tiêu của ngày ${currentDateString} là: ${Math.round(dailyTargetCal)} kcal.`);
    }
}

function saveWeightGoal() {
    const targetW = parseFloat(document.getElementById('target-weight').value);
    const startD = document.getElementById('start-date').value;
    const endD = document.getElementById('end-date').value;
    const currentW = parseFloat(document.getElementById('user-weight').value);

    if (!targetW || !startD || !endD || !currentW) { alert("Vui lòng nhập đủ thông tin!"); return; }

    const d1 = new Date(startD); const d2 = new Date(endD);
    const diffDays = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) { alert("Ngày kết thúc phải sau ngày bắt đầu!"); return; }

    weightGoal = {
        startWeight: currentW, 
        targetWeight: targetW,
        startDate: startD,
        endDate: endD,
        weightPerWeek: (Math.abs(targetW - currentW) / (diffDays/7)).toFixed(2),
        checkpoints: [ { date: startD, weight: currentW } ] // TẠO QUYỂN NHẬT KÝ ĐẦU TIÊN
    };

    localStorage.setItem('myWeightGoal', JSON.stringify(weightGoal));
    document.getElementById('goal-settings')?.removeAttribute('open');
    calculateTargets();
    if(typeof updateWeightChart === 'function') updateWeightChart(); 
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
// 7. LƯU TRỮ LOCAL STORAGE & CỖ MÁY THỜI GIAN
// ==========================================

// HÀM MỚI: Tự động tính Calo mục tiêu cho bất kỳ ngày nào trong lịch sử / tương lai
function getDynamicTargetForDate(targetDateStr) {
    const savedBasic = JSON.parse(localStorage.getItem('myBasicInfo') || '{}');
    const gender = savedBasic.gender || 'male';
    const age = parseFloat(savedBasic.age) || 25;
    const height = parseFloat(savedBasic.height) || 170;
    const currentW = parseFloat(savedBasic.weight) || 70;

    const wg = JSON.parse(localStorage.getItem('myWeightGoal'));
    
    // Nếu chưa có lộ trình, trả về TDEE giữ cân hiện tại
    if (!wg || !wg.startDate || !wg.endDate) {
        let bmr = (10 * currentW) + (6.25 * height) - (5 * age);
        bmr += (gender === 'male') ? 5 : -161;
        return bmr * 1.28; 
    }

    let tDate = new Date(targetDateStr); tDate.setHours(0,0,0,0);
    let sDate = new Date(wg.startDate); sDate.setHours(0,0,0,0);
    let eDate = new Date(wg.endDate); eDate.setHours(0,0,0,0);

    // 1. Gộp mốc 90kg ban đầu và các lần cập nhật thực tế (myWeightHistory) thành Mảng Điểm Neo
    let weightHistoryArray = JSON.parse(localStorage.getItem('myWeightHistory')) || [];
    let updates = [ { date: wg.startDate, weight: wg.startWeight || currentW } ];
    weightHistoryArray.forEach(item => {
        updates.push({ date: item.date, weight: parseFloat(item.weight) });
    });
    updates.sort((a, b) => new Date(a.date) - new Date(b.date)); // Sắp xếp theo thời gian

    // 2. Tìm điểm neo gần nhất với ngày đang xem
    let activeCp = updates[0];
    for (let i = 0; i < updates.length; i++) {
        let uDate = new Date(updates[i].date); uDate.setHours(0,0,0,0);
        if (uDate <= tDate) activeCp = updates[i];
    }
    if (tDate < sDate) activeCp = updates[0];

    // 3. Tính toán lộ trình từ điểm neo đó tới đích
    let cpDate = new Date(activeCp.date); cpDate.setHours(0,0,0,0);
    let daysFromCpToEnd = Math.ceil((eDate - cpDate) / (1000 * 60 * 60 * 24));
    if (daysFromCpToEnd <= 0) daysFromCpToEnd = 1;

    let weightDiffFromCp = wg.targetWeight - activeCp.weight;
    let dailyWeightChange = weightDiffFromCp / daysFromCpToEnd;

    let daysSinceCp = Math.ceil((tDate - cpDate) / (1000 * 60 * 60 * 24));
    if (daysSinceCp < 0) daysSinceCp = 0;
    if (tDate > eDate) daysSinceCp = daysFromCpToEnd;

    // 4. Tính Cân Nặng Lý Thuyết của ngày hôm đó
    let theoreticalWeight = activeCp.weight + (dailyWeightChange * daysSinceCp);

    // 5. LUẬT RỚT 1KG: Chỉ khi giảm/tăng đủ 1kg mới cập nhật Calo
    let kgDiff = theoreticalWeight - activeCp.weight;
    let stepKg = Math.trunc(kgDiff); // VD: -1.8kg sẽ làm tròn thành -1kg
    let stepWeight = activeCp.weight + stepKg;

    // Tính TDEE cho mức cân nặng bậc thang này
    let bmr = (10 * stepWeight) + (6.25 * height) - (5 * age);
    bmr += (gender === 'male') ? 5 : -161;
    let dynamicTDEE = bmr * 1.28;

    // Tính Thâm hụt Calo cần thiết cho số ngày còn lại
    let remainingDays = Math.ceil((eDate - tDate) / (1000 * 60 * 60 * 24));
    let calAdjustment = 0;
    if (remainingDays > 0) {
        calAdjustment = ((wg.targetWeight - stepWeight) * 7700) / remainingDays;
    }

    let finalCal = dynamicTDEE + calAdjustment;
    
    // Giới hạn an toàn (Không cho ăn quá ít)
    if (gender === 'male' && finalCal < 1500 && calAdjustment < 0) finalCal = 1500;
    if (gender === 'female' && finalCal < 1200 && calAdjustment < 0) finalCal = 1200;

    return finalCal;
}

function saveToLocalStorage() {
    const profileData = { 
        targetMacros: targetMacros, 
        dailyTargetCal: dailyTargetCal,
        dailyTargetWater: dailyTargetWater,
        baseTDEE: baseTDEE 
    };
    localStorage.setItem('myFitnessProfile', JSON.stringify(profileData));
    
    let allHistory = JSON.parse(localStorage.getItem('myFitnessHistory')) || {};
    
    allHistory[currentDateString] = { 
        dailyData: dailyData, 
        totalExerciseCal: totalExerciseCal, 
        totalWaterMl: totalWaterMl,
        // Lưu mốc calo chuẩn đã được "Cỗ máy thời gian" tính vào lịch sử
        targetCal: dailyTargetCal 
    };
    
    localStorage.setItem('myFitnessHistory', JSON.stringify(allHistory));

    if (typeof renderHeatmap === 'function') {
        renderHeatmap();
    }
}

function loadFromLocalStorage() {
    const savedBasic = localStorage.getItem('myBasicInfo');
    if (savedBasic) {
        const basicInfo = JSON.parse(savedBasic);
        if (document.getElementById('user-gender')) document.getElementById('user-gender').value = basicInfo.gender || 'male';
        if (document.getElementById('user-age')) document.getElementById('user-age').value = basicInfo.age || '';
        if (document.getElementById('user-height')) document.getElementById('user-height').value = basicInfo.height || '';
        if (document.getElementById('user-weight')) document.getElementById('user-weight').value = basicInfo.weight || '';
    }

    const savedGoal = localStorage.getItem('myWeightGoal');
    const goalSummary = document.getElementById('goal-summary');
    if (savedGoal && goalSummary) {
        weightGoal = JSON.parse(savedGoal);
        goalSummary.classList.remove('hidden');
        
        const originalWeight = weightGoal.startWeight || parseFloat(document.getElementById('user-weight').value) || 0;
        if(originalWeight > 0) {
            const totalDiff = weightGoal.targetWeight - originalWeight;
            const isGain = totalDiff > 0;
            goalSummary.innerHTML = `
                <p class="text-sm text-blue-800">Mục tiêu: <b>${isGain ? 'Tăng' : 'Giảm'} ${Math.abs(totalDiff).toFixed(1)}</b> kg</p>
                <p class="text-sm text-blue-800">Tiến độ: <b>${weightGoal.weightPerWeek}</b> kg / tuần</p>
                <p class="text-sm text-blue-800 italic mt-1">Lộ trình tính toán linh hoạt đã kích hoạt!</p>
            `;
        }
        
        if(document.getElementById('target-weight')) document.getElementById('target-weight').value = weightGoal.targetWeight || '';
        if(document.getElementById('start-date')) document.getElementById('start-date').value = weightGoal.startDate || '';
        if(document.getElementById('end-date')) document.getElementById('end-date').value = weightGoal.endDate || '';
    }

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

    // ========================================================
    // ĐÃ SỬA Ở ĐÂY: Ép giao diện LUÔN DÙNG MỐC ĐỘNG theo Cỗ Máy Thời Gian
    // Quá khứ sẽ hiện mốc 90kg, cập nhật 87kg thì tương lai hiện mốc 87kg
    // ========================================================
    dailyTargetCal = getDynamicTargetForDate(currentDateString);
    
    // Tự động tính lại tỉ lệ 30% Protein, 30% Fat, 40% Carb dựa trên Calo mới
    targetMacros.protein = Math.round((dailyTargetCal * 0.3) / 4);
    targetMacros.fat = Math.round((dailyTargetCal * 0.3) / 9);
    targetMacros.carb = Math.round((dailyTargetCal * 0.4) / 4);

    const proText = document.getElementById('target-protein-text');
    const fatText = document.getElementById('target-fat-text');
    const carbText = document.getElementById('target-carb-text');

    if (dailyTargetCal > 0) {
        if (proText) proText.innerText = `/ ${targetMacros.protein}g`;
        if (fatText) fatText.innerText = `/ ${targetMacros.fat}g`;
        if (carbText) carbText.innerText = `/ ${targetMacros.carb}g`;
    }

    if (typeof updateTotalCalories === 'function') updateTotalCalories();
    if (typeof updateNutrition === 'function') updateNutrition();
    if (typeof updateWaterDisplay === 'function') updateWaterDisplay();
    
    for (let meal in dailyData) {
        const mealEl = document.getElementById(`${meal}-cal`);
        if (mealEl) {
            const mealCal = dailyData[meal].reduce((sum, item) => sum + item.calories, 0);
            mealEl.innerText = `${Math.round(mealCal)} kcal`;
        }
    }

    const exCalEl = document.getElementById('exercise-cal');
    if (exCalEl) exCalEl.innerText = `${Math.round(totalExerciseCal)} kcal`;

    if (typeof checkWeightReminder === 'function') checkWeightReminder();
    if (typeof renderHeatmap === 'function') renderHeatmap();
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
        localStorage.removeItem(CUSTOM_FOOD_STORAGE_KEY);

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

    // Ghi đè số cân mới vào ô cân nặng hồ sơ
    const mainWeightInput = document.getElementById('user-weight');
    if (mainWeightInput) {
        mainWeightInput.value = newWeight;
    }

    // Lưu ngày check-in
    const todayDate = getTodayLocalDateString();
    localStorage.setItem('lastWeighInDate', todayDate);

    // Lưu lịch sử cân nặng TRƯỚC
    upsertWeightHistoryEntry(todayDate, newWeight);

    // Rồi mới tính lại calo/macro
    calculateTargets(false);

    if (typeof updateWeightChart === "function") {
        updateWeightChart(); 
    }

    document.getElementById('weekly-weight-input').value = '';
    const msgEl = document.getElementById('weight-reminder-msg');
    if (msgEl) msgEl.classList.add('hidden');

    alert(`Tuyệt vời! Đã cập nhật cân nặng thành ${newWeight}kg.\n\nHệ thống đã lưu cân mới trước khi tính lại Calo, Macro và biểu đồ.`);
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

// ==========================================
// 11. TÌM KIẾM MÓN ĂN
// ==========================================
function filterFood() {
    const searchKeyword = document.getElementById('food-search').value.toLowerCase();
    renderFoodOptions(searchKeyword);
}
// ==========================================
// 12. BIỂU ĐỒ HEATMAP (DẠNG LỊCH THÁNG)
// ==========================================
let currentHeatmapMonthOffset = 0; // 0 = Tháng này, -1 = Tháng trước...

function renderHeatmap() {
    const container = document.getElementById('heatmap-grid');
    if(!container) return;
    container.innerHTML = ''; 

    let today = new Date();
    let targetDate = new Date(today.getFullYear(), today.getMonth() + currentHeatmapMonthOffset, 1);
    let year = targetDate.getFullYear();
    let month = targetDate.getMonth();

    let daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDay = new Date(year, month, 1).getDay();
    let startOffset = firstDay === 0 ? 6 : firstDay - 1;

    let allHistory = JSON.parse(localStorage.getItem('myFitnessHistory')) || {};
    
    // LẤY MỤC TIÊU CALO TỪ HỆ THỐNG (Làm mức mặc định nếu ngày xưa không lưu)
    let targetCal = window.dailyTargetCal || window.baseTDEE || 2000;

    for(let i = 0; i < startOffset; i++) {
        let emptyBox = document.createElement('div');
        emptyBox.style.width = '34px';
        emptyBox.style.height = '34px';
        container.appendChild(emptyBox);
    }

    for(let day = 1; day <= daysInMonth; day++) {
        let box = document.createElement('div');
        box.className = 'heatmap-box-horiz hm-empty';
        box.innerText = day; 

        let mStr = String(month + 1).padStart(2, '0');
        let dStr = String(day).padStart(2, '0');
        let dateStr = `${year}-${mStr}-${dStr}`;
        let displayDate = `${day}/${month + 1}`;

        if (allHistory[dateStr]) {
            let data = allHistory[dateStr];
            let foodCal = 0;
            for (let meal in data.dailyData) {
                foodCal += data.dailyData[meal].reduce((sum, item) => sum + item.calories, 0);
            }
            let netCal = foodCal - (data.totalExerciseCal || 0);

            // Ưu tiên lấy mốc calo ĐÃ LƯU của ngày hôm đó, nếu ngày xưa chưa lưu thì mới dùng mốc hiện tại chữa cháy
            let historicalTarget = data.targetCal || targetCal; 

            let diff = netCal - historicalTarget; // Tính toán dựa trên lịch sử

            // LOGIC MÀU SẮC THEO YÊU CẦU CỦA BẠN:
            let statusLabel = "";
            if (diff < -100) {
                box.className = 'heatmap-box-horiz hm-purple';
                statusLabel = "Quá ít calo";
            } else if (diff <= -50) {
                box.className = 'heatmap-box-horiz hm-perfect';
                statusLabel = "Rất tốt";
            } else if (diff < 100) {
                // Từ -49 đến +99 
                box.className = 'heatmap-box-horiz hm-good';
                statusLabel = "An toàn";
            } else if (diff < 250) {
                // Từ +100 đến +249 
                box.className = 'heatmap-box-horiz hm-warn';
                statusLabel = "Chú ý: Lố nhẹ";
            } else if (diff < 400) {
                // Từ +250 đến +399
                box.className = 'heatmap-box-horiz hm-orange';
                statusLabel = "Hơi lố";
            } else {
                // Từ +400 trở lên 
                box.className = 'heatmap-box-horiz hm-danger';
                statusLabel = "Lố quá";
            }

            // Gắn thông số chi tiết khi di chuột vào 
            let sign = diff > 0 ? "+" : "";
            // ĐÃ SỬA Ở ĐÂY: Thay targetCal thành historicalTarget để hiển thị đúng Mốc
            box.setAttribute('data-info', `${displayDate} | ${statusLabel} | Nạp: ${Math.round(netCal)} (Mốc: ${Math.round(historicalTarget)} | Chênh: ${sign}${Math.round(diff)})`);
        } else {
            box.setAttribute('data-info', `${displayDate}: Chưa ghi chép`);
        }

        container.appendChild(box);
    }

    let label = document.getElementById('heatmap-month-label');
    if (label) {
        label.innerText = `Tháng ${month + 1} / ${year}`;
    }
}

function changeHeatmapMonth(dir) {
    if (dir > 0 && currentHeatmapMonthOffset >= 0) {
        alert("Chưa tới tương lai, cứ sống tốt hiện tại đã bạn nhé!");
        return;
    }
    currentHeatmapMonthOffset += dir;
    renderHeatmap();
}
// ==========================================
// HÀM VẼ BIỂU ĐỒ (Đã Fix Lỗi Nhịn Đói & Dừng Ở Hiện Tại)
// ==========================================
function updateWeightChart() {
    const ctx = document.getElementById('weightChart');
    if (!ctx || !weightGoal.startDate || !weightGoal.endDate) return;

    let labels = [];
    let targetData = [];
    let actualData = [];

    let start = new Date(weightGoal.startDate);
    let end = new Date(weightGoal.endDate);
    
    let startWeight = weightGoal.startWeight || parseFloat(document.getElementById('user-weight').value) || 0;
    let targetWeight = weightGoal.targetWeight;

    let totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) return;

    let weightChangePerDay = (targetWeight - startWeight) / totalDays;

    let weightHistoryArray = JSON.parse(localStorage.getItem('myWeightHistory')) || [];
    let weightHistoryMap = {};
    weightHistoryArray.forEach(item => {
        weightHistoryMap[item.date] = item.weight;
    });

    let currentBaseTDEE = baseTDEE > 0 ? baseTDEE : 2000; 
    let runningActualWeight = startWeight;
    
    // Lấy ngày hôm nay chuẩn theo giờ máy tính
    let today = new Date();
    let todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    for (let i = 0; i <= totalDays; i++) {
        let d = new Date(start);
        d.setDate(d.getDate() + i);
        let dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

        labels.push(i % 7 === 0 ? `Tuần ${i/7}` : dateStr.split('-').slice(1).join('/'));

        // 1. ĐƯỜNG MÀU XÁM (Đề xuất): Luôn vẽ từ lúc bắt đầu đến ngày kết thúc
        targetData.push((startWeight + (i * weightChangePerDay)).toFixed(2));

        // 2. ĐƯỜNG MÀU XANH (Thực tế): Chỉ vẽ tới hôm nay, tương lai để trống!
        if (dateStr > todayStr) {
            actualData.push(null); // Tương lai chưa tới -> Không vẽ
        } else {
            let allHistory = JSON.parse(localStorage.getItem('myFitnessHistory')) || {};
            
            if (weightHistoryMap[dateStr]) {
                // Nếu có cập nhật cân nặng ở tab Trang Chủ
                runningActualWeight = parseFloat(weightHistoryMap[dateStr]);
            } else if (allHistory[dateStr]) {
                let dayData = allHistory[dateStr];
                let foodCal = 0;
                if (dayData.dailyData) {
                    for (let meal in dayData.dailyData) {
                        foodCal += dayData.dailyData[meal].reduce((sum, item) => sum + item.calories, 0);
                    }
                }
                
                // ĐÃ FIX: CHỈ KHI CÓ NHẬP ĐỒ ĂN HOẶC CÓ TẬP LUYỆN -> mới tính là giảm mỡ
                // Nếu lười nhập (Calo = 0) -> Cân nặng đi ngang, không trừ oan!
                if (foodCal > 0 || (dayData.totalExerciseCal && dayData.totalExerciseCal > 0)) {
                    let netCal = foodCal - (currentBaseTDEE + (dayData.totalExerciseCal || 0));
                    let weightChange = netCal / 7700; 
                    runningActualWeight += weightChange;
                }
            }
            actualData.push(runningActualWeight.toFixed(2));
        }
    }

    if (typeof weightChartInstance !== 'undefined' && weightChartInstance) {
        weightChartInstance.destroy();
    }

    weightChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Đề xuất quá trình', 
                    data: targetData,
                    borderColor: '#94a3b8', // Màu xám
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Cân nặng thực tế', 
                    data: actualData,
                    borderColor: '#22c55e', // Màu xanh lá
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.3,
                    spanGaps: false // BẮT BUỘC FALSE: Để biểu đồ bị đứt đoạn, dừng lại đúng ngày hôm nay
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