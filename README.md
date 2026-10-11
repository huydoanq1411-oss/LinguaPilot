# LinguaPilot

LinguaPilot là không gian học tiếng Nhật bằng tiếng Việt. Ứng dụng gồm trang chủ React, thư viện bài học JLPT tĩnh và API Express/Prisma dùng PostgreSQL cho tài khoản người học.

## Thành phần

- `client/`: React và Vite. Trang chủ giới thiệu lộ trình, liên kết tới bài học, tra cứu và bài kiểm tra JLPT; hỗ trợ đăng ký, đăng nhập và xem phiên người dùng.
- `client/public/jp/`: bài học, tra cứu Kanji và bài kiểm tra JLPT N5 đến N1.
- `server/`: Express API, xác thực JWT và Prisma schema/migrations.
- `docker-compose.yml`: PostgreSQL và pgAdmin.

## Chạy ứng dụng

### 1. Cấu hình môi trường

Sao chép `.env.example` thành `.env` ở thư mục gốc cho Docker Compose và `server/.env.example` thành `server/.env` cho API. Nếu cần đổi địa chỉ API của giao diện, sao chép `client/.env.example` thành `client/.env`. Các file mẫu chỉ chứa giá trị minh họa; thay mật khẩu và bí mật bằng giá trị riêng trên máy của bạn. Đặt các biến Compose vào file gốc:

```dotenv
POSTGRES_USER=linguapilot
POSTGRES_PASSWORD=change-this-password
POSTGRES_DB=linguapilot
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=change-this-password
```

Thêm các biến API vào `server/.env` (dùng cùng thông tin PostgreSQL đã khai báo ở trên):

```dotenv
DATABASE_URL=postgresql://linguapilot:change-this-password@localhost:5434/linguapilot?schema=public
JWT_SECRET=replace-with-a-random-secret-at-least-16-characters
CLIENT_ORIGIN=http://localhost:5173
PORT=3000
```

Không commit các file `.env`.

### 2. Khởi động database và API

Tại thư mục gốc, chạy PostgreSQL:

```bash
docker compose up -d db
```

Sau đó tại `server/`, cài dependencies, tạo Prisma Client và áp dụng migration:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

API mặc định chạy tại `http://localhost:3000`. `GET /api/health` kiểm tra kết nối database. PgAdmin chạy tại `http://localhost:5050` nếu cần, bằng lệnh `docker compose up -d`.

### 3. Khởi động giao diện

Tại `client/`:

```bash
npm install
npm run dev
```

### 4. Mở ứng dụng

Giữ terminal API và Vite đang chạy, rồi mở trình duyệt tại:

- `http://localhost:5173/` — trang chủ React, gồm đăng nhập/đăng ký và liên kết tới nội dung học.
- `http://localhost:5173/jp/index.html` — thư viện bài học tiếng Nhật.

Mở các trang qua địa chỉ Vite thay vì mở file HTML trực tiếp để tài nguyên tĩnh và điều hướng hoạt động nhất quán. Đăng nhập cần API và PostgreSQL đang chạy; các bài học tĩnh có thể xem mà không cần tài khoản.

## API xác thực

- `POST /api/auth/register` — đăng ký bằng `email`, `password` (tối thiểu 8 ký tự), và `displayName` tùy chọn.
- `POST /api/auth/login` — đăng nhập và nhận JWT.
- `GET /api/auth/me` — trả về tài khoản hiện tại; gửi header `Authorization: Bearer <token>`.

JWT có thời hạn 7 ngày. Trang chủ lưu token trong `localStorage` để khôi phục phiên trên cùng trình duyệt.

## Mô hình dữ liệu

Prisma schema hiện có ba model:

- `User`: tài khoản với email duy nhất, mật khẩu đã băm, tên hiển thị và thời điểm tạo. Xóa user sẽ xóa các flashcard và bài nộp liên quan.
- `Flashcard`: thẻ học thuộc về một user, có ngôn ngữ (`ja` hoặc `en`), cấp độ, mặt trước/mặt sau và các trường phục vụ lịch ôn (`repetitions`, `intervalDays`, `ease`, `nextReview`). Có index theo user và thời điểm ôn tiếp theo.
- `Submission`: bài làm thuộc về một user, phân loại kỳ thi (`JLPT` hoặc `IELTS`), cấp độ, đề bài, nội dung, điểm tùy chọn, phản hồi JSON và thời điểm tạo. Có index theo user và thời điểm tạo.

Hiện các model `Flashcard` và `Submission` đã có trong schema nhưng chưa có route API tương ứng; API được triển khai hiện tại chỉ bao gồm health check và xác thực.

## Nội dung tiếng Nhật

Mở `/jp/index.html` để vào thư viện. Các trang `phan01.html` đến `phan10.html` tạo lộ trình từ nền tảng đến N1; `test-n5.html` đến `test-n1.html` là bài kiểm tra theo cấp độ; `kiem-tra-thang-cap.html` là bài kiểm tra tổng hợp.

### Cách hoạt động của bài trắc nghiệm

- Các trang JLPT là HTML tĩnh, tải dữ liệu câu hỏi từ `client/public/jp/quiz-bank.js` rồi khởi tạo hành vi bằng `quiz-engine.js`. Vì vậy, phần luyện tập này không cần API hay tài khoản.
- Ngân hàng chia câu hỏi theo cấp độ (`kana`, `n5`, `n4`, `n3n2`, `n2`, `n1`). Mỗi câu có mã định danh theo tên trang nguồn và số thứ tự; dữ liệu cũng lưu lựa chọn đúng, lựa chọn nhiễu và ngữ cảnh đọc nếu có.
- Sau khi chấm bài, nút **Làm lại với bộ câu mới** chọn câu khác trong ngân hàng cùng cấp độ và trộn thứ tự lựa chọn. Với bài tổng hợp, việc chọn câu diễn ra riêng theo từng nhóm/cấp độ. Nếu ngân hàng không còn đủ câu phù hợp để tạo bộ mới, nút sẽ báo thiếu câu.
- Các trang HTML bài học/kiểm tra là nguồn câu hỏi; sau khi chỉnh câu, chạy `powershell -ExecutionPolicy Bypass -File .\\client\\public\\jp\\build-quiz-bank.ps1` từ thư mục gốc để tạo lại `quiz-bank.js`. Script phân cấp, lấy ngữ cảnh đọc và loại câu trùng theo cấp độ. Engine ghép câu đang hiển thị bằng câu dẫn và tập lựa chọn, nên cần giữ các phần này đồng bộ.
- Tiến độ hoàn thành bài học được lưu cục bộ trong trình duyệt bằng `localStorage` (các khóa `done_bai*`). Dữ liệu này hiện không đồng bộ với tài khoản hay PostgreSQL; xóa dữ liệu trang web/trình duyệt có thể làm mất tiến độ.
