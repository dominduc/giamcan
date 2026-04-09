// Dữ liệu chuẩn (Tham khảo từ USDA và Viện Dinh dưỡng) tính trên 100g
const foodDatabase = [
    // ... Giữ lại các món cũ của bạn nếu cần, hoặc thay thế bằng danh sách dưới đây:

    // --- TRÁI CÂY & ĐỒ UỐNG (Tính theo 1 đơn vị: quả/lon/cốc) ---
    { id: 'f8', name: 'Chuối (1 quả vừa)', calPer100g: 105, protein: 1.3, fat: 0.4, carb: 27, fiber: 3, vitC: 10, omega3: 0, cholesterol: 0 },
    { id: 'f9', name: 'Bưởi (1 múi lớn)', calPer100g: 20, protein: 0.4, fat: 0, carb: 5, fiber: 0.6, vitC: 30, omega3: 0, cholesterol: 0 },
    { id: 'f10', name: 'Nước dừa + Cùi dừa (1 quả)', calPer100g: 140, protein: 2, fat: 5, carb: 22, fiber: 3, vitC: 2, omega3: 0, cholesterol: 0 },
    { id: 'f11', name: 'Trà tắc (1 cốc)', calPer100g: 80, protein: 0, fat: 0, carb: 20, fiber: 0, vitC: 5, omega3: 0, cholesterol: 0 },
    { id: 'f12', name: 'Nước ép dưa hấu (1 cốc)', calPer100g: 90, protein: 1.8, fat: 0.4, carb: 21, fiber: 1, vitC: 15, omega3: 0, cholesterol: 0 },
    { id: 'f13', name: 'Trà đào túi hộp (1 cốc)', calPer100g: 150, protein: 0.5, fat: 0, carb: 38, fiber: 0.5, vitC: 2, omega3: 0, cholesterol: 0 },
    { id: 'f14', name: 'Bò húc (1 lon 250ml)', calPer100g: 112, protein: 0, fat: 0, carb: 28, fiber: 0, vitC: 0, omega3: 0, cholesterol: 0 },
    { id: 'f15', name: 'Monster Energy (1 lon 500ml)', calPer100g: 210, protein: 0, fat: 0, carb: 54, fiber: 0, vitC: 0, omega3: 0, cholesterol: 0 },
    { id: 'f16', name: 'Sữa Vinamilk Ít Đường (180ml)', calPer100g: 126, protein: 5.4, fat: 6.3, carb: 12, fiber: 0, vitC: 1.8, omega3: 0, cholesterol: 18 },

    // --- CÁC MÓN MẶN TÍNH THEO THÌA/MIẾNG (1 lần xúc) ---
    { id: 'f17', name: 'Tôm xào (1 thìa ~ 2 con)', calPer100g: 35, protein: 5, fat: 1.5, carb: 0.5, fiber: 0, vitC: 0.5, omega3: 0.1, cholesterol: 40 },
    { id: 'f18', name: 'Lạc rang (1 thìa)', calPer100g: 60, protein: 2.5, fat: 5, carb: 1.5, fiber: 1, vitC: 0, omega3: 0, cholesterol: 0 },
    { id: 'f19', name: 'Thịt luộc (1 miếng vừa)', calPer100g: 45, protein: 3, fat: 4, carb: 0, fiber: 0, vitC: 0, omega3: 0, cholesterol: 15 },
    { id: 'f20', name: 'Thịt lợn xào (1 thìa)', calPer100g: 55, protein: 4, fat: 4.5, carb: 0.5, fiber: 0, vitC: 0, omega3: 0, cholesterol: 18 },
    { id: 'f21', name: 'Đậu phụ sốt cà chua (1 miếng)', calPer100g: 40, protein: 2.5, fat: 2.5, carb: 2, fiber: 0.4, vitC: 1, omega3: 0, cholesterol: 0 },
    { id: 'f22', name: 'Đùi gà tỏi chiên mắm (1 cái)', calPer100g: 250, protein: 18, fat: 18, carb: 4, fiber: 0, vitC: 0, omega3: 0.2, cholesterol: 88 },

    // --- COMBO MÓN ĂN (Tính theo 1 suất/đĩa) ---
    { id: 'f23', name: 'Bún chả (Suất 35k)', calPer100g: 550, protein: 25, fat: 22, carb: 65, fiber: 2, vitC: 2, omega3: 0.1, cholesterol: 95 },
    { id: 'f24', name: 'Cơm rang trứng xúc xích', calPer100g: 650, protein: 18, fat: 35, carb: 68, fiber: 1.5, vitC: 2, omega3: 0.1, cholesterol: 220 },
    { id: 'f25', name: 'Cơm rang thịt xiên nướng', calPer100g: 780, protein: 26, fat: 38, carb: 75, fiber: 1.8, vitC: 2, omega3: 0.2, cholesterol: 250 }
];