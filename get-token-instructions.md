# Lấy Auth Token từ Browser

## Bước 1: Mở Browser DevTools
1. Truy cập: http://localhost:5173
2. Nhấn `F12` hoặc `Ctrl+Shift+I` để mở DevTools

## Bước 2: Lấy Token
1. Chọn tab **Console**
2. Gõ lệnh:
```javascript
localStorage.getItem('auth_token')
```
3. Copy token (bỏ dấu ngoặc kép)

## Bước 3: Chạy Test
```bash
./test-phase-transition.sh
```

Paste token khi script hỏi.

---

**Hoặc chạy ngay với token có sẵn:**
```bash
AUTH_TOKEN="your-token-here" ./test-phase-transition.sh
```
