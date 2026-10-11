# LinguaPilot

LinguaPilot là không gian học tiếng Nhật bằng tiếng Việt. Ứng dụng gồm trang chủ React, thư viện bài học JLPT tĩnh và API Express/Prisma dùng PostgreSQL cho tài khoản người học.

## Thành phần

- `client/`: React và Vite. Trang chủ giới thiệu lộ trình, liên kết tới bài học, tra cứu và bài kiểm tra JLPT; hỗ trợ đăng ký, đăng nhập và xem phiên người dùng.
- `client/public/jp/`: bài học, tra cứu Kanji và bài kiểm tra JLPT N5 đến N1.
- `server/`: Express API, xác thực JWT và Prisma schema/migrations.
- `docker-compose.yml`: PostgreSQL và pgAdmin.

## Chạy ứng dụng

### 1. Cấu hình môi trường

Tạo file `.env` ở thư mục gốc cho Docker Compose và file `server/.env` cho API. Đặt các biến Compose vào file gốc:

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

Mở địa chỉ Vite in ra trên terminal (mặc định `http://localhost:5173`). Giao diện gọi API tại `http://localhost:3000/api`; có thể đặt `VITE_API_URL` nếu API chạy ở địa chỉ khác.

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
