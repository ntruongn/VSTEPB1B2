# VSTEP Portal - Hệ Thống Luyện Thi VSTEP 4 Kỹ Năng

Chào mừng bạn đến với **VSTEP Portal**, ứng dụng web luyện thi tiếng Anh theo chuẩn định dạng VSTEP (A2-B1-B2-C1). Ứng dụng này cung cấp môi trường làm bài thi thử trực quan, mượt mà cho cả 4 kỹ năng **Đọc (Reading)**, **Nghe (Listening)**, **Viết (Writing)**, và **Nói (Speaking)** cùng với kho dữ liệu đề thi phong phú.

---

## Các Tính Năng Nổi Bật

1. **Dashboard & Lựa Chọn Đề Thi**:
   - Giao diện tối (Dark Mode) mặc định, mang lại trải nghiệm chuyên nghiệp, mượt mà và tập trung.
   - Hiển thị trực quan số lượng đề thi có sẵn cho từng kỹ năng.

2. **Kỹ Năng Đọc (Reading)**:
   - Giao diện chia đôi màn hình (Split Screen): Một bên hiển thị bài đọc, một bên hiển thị bộ câu hỏi.
   - **Tính năng Dịch Từng Câu (Hover Translation)**: Nhấn nút **"Dịch tiếng Việt"** ở thanh điều hướng trên cùng, sau đó rê chuột vào bất cứ câu tiếng Anh nào để tô sáng câu đó và hiển thị bản dịch tiếng Việt nổi ngay bên trên.

3. **Kỹ Năng Nghe (Listening)**:
   - Tích hợp trình phát Audio chuẩn.
   - Cung cấp nút xem **Transcript tiếng Anh** và **Bản dịch tiếng Việt** dạng Offcanvas kéo ra từ cạnh phải màn hình để hỗ trợ luyện tập.

4. **Kỹ Năng Viết (Writing)**:
   - Hiển thị chi tiết yêu cầu đề bài (viết thư, viết bài luận).
   - Khung soạn thảo văn bản phản hồi kèm bộ đếm từ tự động (Live Word Counter).

5. **Kỹ Năng Nói (Speaking)**:
   - Hiển thị chủ đề Nói theo từng phần của cấu trúc VSTEP.
   - Tích hợp bộ ghi âm mic trực tiếp trên nền tảng Web Audio API kèm theo đồng hồ đếm thời gian thu âm.
   - Hỗ trợ nghe lại bản thu âm và tải bản thu âm dưới định dạng `.webm`.

6. **Chấm Điểm & Giải Thích Chi Tiết**:
   - Sau khi nhấn **Nộp bài** ở phần Đọc/Nghe, ứng dụng hiển thị bảng điểm tổng quát tỉ lệ chính xác và đánh dấu màu trực quan cho từng đáp án: màu xanh lá (đáp án đúng) và màu đỏ (đáp án sai của bạn).
   - Tự động hiển thị giải thích đáp án chi tiết phía dưới mỗi câu hỏi.

---

## Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Yêu Cầu Hệ Thống
- Đã cài đặt **Python 3.8+** trở lên.

### 2. Cài Đặt Thư Viện
Kích hoạt môi trường ảo (Virtual Environment) và cài đặt các dependencies từ file `requirements.txt`:

```bash
# Kích hoạt virtual environment (tùy thuộc vào OS)
source .venv/bin/activate

# Cài đặt các thư viện cần thiết
pip install -r requirements.txt
```

### 3. Chạy Ứng Dụng Web Portal
Chạy máy chủ Flask bằng lệnh:

```bash
python app.py
```

Mặc định máy chủ sẽ khởi động tại địa chỉ: **[http://localhost:8888](http://localhost:8888)**. Bạn có thể mở trình duyệt và truy cập liên kết này để bắt đầu làm bài.

---

## Hướng Dẫn Sử Dụng Tính Năng Cào Dữ Liệu (Dành Cho Lập Trình Viên)

Hệ thống đã được tích hợp bộ mã nguồn cào dữ liệu tự động (`scrape_vstep_all.py`) thông qua kết nối trực tiếp với trình duyệt Chrome qua cổng kết nối Chrome DevTools Protocol (CDP) trên cổng `9222`.

### Các Lệnh Cào Dữ Liệu Theo Từng Phần:

1. **Cào các đề Đọc (Reading - 52 đề)**:
   ```bash
   python scrape_vstep_all.py --category reading --start 1 --end 52
   ```

2. **Cào các đề Nghe (Listening - 42 đề)**:
   ```bash
   python scrape_vstep_all.py --category listening --start 1 --end 42
   ```

3. **Cào các đề Viết (Writing)**:
   ```bash
   python scrape_vstep_all.py --category writing --ids 1,2,3,5,6,7,10,13,16,20,22,23,24,25,26,28,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,66,67,68,69,70,71,72,73,74
   ```

4. **Cào các đề Nói (Speaking)**:
   ```bash
   python scrape_vstep_all.py --category speaking --ids 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163
   ```
