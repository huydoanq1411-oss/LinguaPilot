# Truy cập bài học

- Mọi trang `/jp/*.html` yêu cầu tài khoản có phiên đăng nhập hợp lệ, trên trình duyệt và app cài từ website.
- Chưa đăng nhập hoặc phiên không hợp lệ: chuyển về form đăng nhập, giữ đường dẫn bài muốn mở. Đăng nhập/tạo tài khoản thành công: mở bài đó, mặc định thư viện.
- Khi bấm liên kết bài học từ trang chủ mà chưa đăng nhập: giữ nguyên trang, cuộn đến form và focus email; giữ bài đã chọn để mở sau đăng nhập. Người đã đăng nhập mở bài trực tiếp.
- Loading dùng thông báo trạng thái cùng dải chuyển động nhẹ theo màu giao diện; ngừng chuyển động khi lỗi, hiện thử lại và tôn trọng reduced motion.
- Mọi liên kết bài học trên trang chủ dùng `#account` khi chưa đăng nhập. Mở URL bài trực tiếp khi chưa có token chuyển về form từ đầu trang, không hiện loading; HTML trang tải và tài nguyên xác thực dùng `Cache-Control: no-store`.
- API không xác minh được phiên hoặc mất mạng: không tải nội dung bài học; có nút thử lại.
- Nội dung HTML và ngân hàng câu hỏi nằm trong `server/lessons`, không có trong bản build frontend công khai. `GET /api/lessons/:page` yêu cầu Bearer JWT và kiểm tra tài khoản còn tồn tại; trả `Cache-Control: private, no-store`.
- Các URL cũ giữ nguyên; trang công khai chỉ là màn hình tải và đăng nhập. Tiến độ tiếp tục dùng localStorage, chưa đồng bộ tài khoản.
- Client và API tiếp tục là hai dự án Vercel. Client lấy URL API từ `VITE_API_URL`; bản build tạo `/app-config.json` cho trang tải bài học. Server build tạo Prisma Client và áp dụng migration trước khi phục vụ bản mới.
- Giới hạn đăng nhập giữ nguyên: tối đa 10 lần sai theo email trong cửa sổ 15 phút, lần tiếp theo trả 429; đăng nhập đúng xóa bộ đếm.
- Mật khẩu đăng ký vẫn cần ít nhất 8 ký tự; cả đăng ký và đăng nhập từ chối mật khẩu vượt 72 byte UTF-8 trước khi gọi bcrypt/DB. Frontend kiểm cùng giới hạn theo byte, không cắt hoặc chuẩn hóa mật khẩu. Hash đang có không thay đổi; mật khẩu cũ vượt giới hạn cần được đặt lại qua quy trình hỗ trợ, không tự cắt ngắn để đăng nhập.
- Quiz ưu tiên cấp độ khai báo của section (`data-quiz-level` nếu có, sau đó nhãn/tiêu đề) trước số bài. Script sinh ngân hàng và engine dùng cùng thứ tự; bài bổ sung lớn hơn 200 không tự mặc định N1.
- Form đăng nhập/đăng ký: input 16px, label 14px, chú thích 13px với tương phản chữ thường tối thiểu 4,5:1.
- Tra Kanji: dữ liệu dịch vụ ngoài, nội dung nhập và chi tiết lỗi chỉ được gán qua textContent; innerHTML chỉ chứa template tĩnh của ứng dụng.
- Nghiệm thu: mở link trực tiếp khi chưa đăng nhập không nhận nội dung; token giả/hết hạn bị từ chối; đăng nhập hợp lệ mở được bài và quiz; đăng xuất rồi quay lại không mở lại từ bộ nhớ trang; lỗi mạng có thể thử lại.
- Ngoài phạm vi: đồng bộ tiến độ, thu phí, thay thiết kế, thu hồi token trên mọi thiết bị. Người đã được cấp nội dung vẫn có thể tự lưu bản sao; mã nguồn repo công khai vẫn xem được trên GitHub.
