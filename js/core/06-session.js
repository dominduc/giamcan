// Chia sẻ NGÀY ĐANG XEM giữa Trang chủ và Trang Dinh dưỡng trong cùng một
// phiên trình duyệt (sessionStorage), KHÔNG lưu vĩnh viễn như localStorage.
//
// - index.html và nutrition.html: đọc giá trị này khi tải trang, ghi lại
//   mỗi khi người dùng đổi ngày, để 2 trang luôn khớp ngày với nhau.
// - notes.html và profile.html: xóa giá trị này ngay khi tải trang, để lần
//   sau quay lại Trang chủ / Dinh dưỡng luôn bắt đầu lại từ hôm nay.
const SESSION_DATE_KEY = 'weightNote.session.selectedDate';

export function getSharedSelectedDate() {
  try {
    return sessionStorage.getItem(SESSION_DATE_KEY);
  } catch {
    return null;
  }
}

export function setSharedSelectedDate(dateKey) {
  try {
    sessionStorage.setItem(SESSION_DATE_KEY, dateKey);
  } catch {
    // sessionStorage có thể bị chặn (vd. chế độ ẩn danh nghiêm ngặt) — bỏ qua.
  }
}

export function clearSharedSelectedDate() {
  try {
    sessionStorage.removeItem(SESSION_DATE_KEY);
  } catch {
    // ignore
  }
}