# Truy cập bài học

- Mọi trang `/jp/*.html` yêu cầu tài khoản có phiên đăng nhập hợp lệ, trên trình duyệt và app cài từ website.
- Chưa đăng nhập hoặc phiên không hợp lệ: chuyển về form đăng nhập, giữ đường dẫn bài muốn mở. Đăng nhập/tạo tài khoản thành công: mở bài đó, mặc định thư viện.
- API không xác minh được phiên hoặc mất mạng: không tải nội dung bài học; có nút thử lại.
- Nội dung HTML và ngân hàng câu hỏi nằm trong `server/lessons`, không có trong bản build frontend công khai. `GET /api/lessons/:page` yêu cầu Bearer JWT và kiểm tra tài khoản còn tồn tại; trả `Cache-Control: private, no-store`.
- Các URL cũ giữ nguyên; trang công khai chỉ là màn hình tải và đăng nhập. Tiến độ tiếp tục dùng localStorage, chưa đồng bộ tài khoản.
- Client và API tiếp tục là hai dự án Vercel. Client lấy URL API từ `VITE_API_URL`; bản build tạo `/app-config.json` cho trang tải bài học. Server build tạo Prisma Client và áp dụng migration trước khi phục vụ bản mới.
- Giới hạn đăng nhập giữ nguyên: tối đa 10 lần sai theo email trong cửa sổ 15 phút, lần tiếp theo trả 429; đăng nhập đúng xóa bộ đếm.
- Nghiệm thu: mở link trực tiếp khi chưa đăng nhập không nhận nội dung; token giả/hết hạn bị từ chối; đăng nhập hợp lệ mở được bài và quiz; đăng xuất rồi quay lại không mở lại từ bộ nhớ trang; lỗi mạng có thể thử lại.
- Ngoài phạm vi: đồng bộ tiến độ, thu phí, thay thiết kế, thu hồi token trên mọi thiết bị. Người đã được cấp nội dung vẫn có thể tự lưu bản sao; mã nguồn repo công khai vẫn xem được trên GitHub.
