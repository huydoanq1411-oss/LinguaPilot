# LinguaPilot

LinguaPilot là không gian học tiếng Nhật bằng tiếng Việt. Ứng dụng gồm trang chủ React, thư viện bài học JLPT tĩnh và API Express/Prisma dùng PostgreSQL cho tài khoản người học.

## 1. Công cụ dùng và để làm gì
Phần	Công cụ	Dùng để làm gì
Giao diện	React 19, Vite 8	Trang chủ, form đăng ký/đăng nhập, liên kết tới bài học
Giao diện	ESLint	Kiểm tra lỗi code (npm run lint)
Giao diện	Tailwind CSS 4	Có cài trong package.json nhưng chưa được dùng (cấu hình Vite và file CSS không gọi tới)
Bài học	HTML/CSS/JS thuần (27 file trong client/public/jp)	Thư viện học tiếng Nhật, không cần server
Bài học	kanjiapi.dev, Google Fonts	Tra cứu Kanji (API ngoài) và font chữ
API	Node.js, Express 5	Chạy các đường dẫn /api/...
API	bcryptjs	Mã hóa mật khẩu (cost 12)
API	jsonwebtoken (JWT)	Cấp token đăng nhập
API	helmet, cors	Header bảo mật và chỉ cho phép domain client gọi API
Database	PostgreSQL 16, Prisma 6	Lưu dữ liệu, tạo bảng bằng migration
Chạy ở máy	Docker Compose, pgAdmin	Chạy PostgreSQL ở máy bạn và giao diện xem database
Đưa lên mạng	Vercel, Prisma Postgres, GitHub	Hosting client, server, database và tự deploy khi push
## 2. Các thành phần và vai trò
Thành phần	Thư mục	Nội dung
Trang chủ React	client/src	Giới thiệu, đăng ký/đăng nhập, kiểm tra trạng thái API, lưu token trong localStorage
Thư viện JLPT	client/public/jp	10 phần bài học (phan01 đến phan10), 5 bài test N5 đến N1, bảng chữ cái, tra Kanji, từ vựng N5, luyện viết, kiểm tra trình độ, cấu trúc JLPT
API	server/src	Đăng ký, đăng nhập, xem phiên, kiểm tra sức khỏe
Database	server/prisma	3 bảng (xem mục 4)
## 3. Có 4 cách chạy
#	Cách chạy	Cần chạy gì	Lệnh chính	Địa chỉ mở	Dùng được gì
1	Đầy đủ trên máy	Docker (DB), server, client: 3 tiến trình	docker compose up -d db, rồi trong server: npx prisma migrate deploy và npm run dev, rồi trong client: npm run dev	http://localhost:5173	Tất cả, kể cả đăng nhập
2	Chỉ phần học, mở trên điện thoại cùng Wi-Fi	Chỉ client	Trong client: npm run dev -- --host 0.0.0.0	http://<IP máy>:5173/jp/index.html	Bài học tĩnh. Đăng nhập không chạy vì điện thoại không gọi được localhost:3000
3	Chỉ phần tĩnh, không cần server	Bất kỳ web server nào (Vite hoặc npm run build rồi npm run preview)	npm run dev hoặc npm run build	/jp/index.html	Toàn bộ bài học và test
4	Trên Internet (hiện tại)	Không cần máy bạn	git push lên main	lingua-pilot.vercel.app	Tất cả, kể cả khi tắt máy

Cách 1 cần 4 file cấu hình: .env ở gốc (cho Docker), server/.env (với DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN, PORT) và client/.env (nếu đổi địa chỉ API). Các cổng mặc định: client 5173, server 3000, PostgreSQL 5434, pgAdmin 5050.

## 4. API và dữ liệu
Đường dẫn	Chức năng	Ghi chú
GET /api/health	Kiểm tra server và database	Trả {"ok":true,"db":"up"}
POST /api/auth/register	Đăng ký	Email hợp lệ, mật khẩu từ 8 ký tự, trả token
POST /api/auth/login	Đăng nhập	Báo lỗi chung chung để tránh lộ email nào tồn tại
GET /api/auth/me	Lấy thông tin người dùng	Cần token
Bảng	Dùng để	Trạng thái
User	Tài khoản (email, mật khẩu đã mã hóa, tên hiển thị)	Đang dùng
Flashcard	Thẻ ôn tập theo lịch lặp lại (số lần ôn, khoảng cách ngày, ngày ôn kế)	Có bảng, chưa có API
Submission	Bài nộp và phản hồi (kỳ thi JLPT hoặc IELTS)	Có bảng, chưa có API
##5. Nhận xét
Hai bảng chưa dùng: schema đã chừa chỗ cho thẻ ôn tập và bài nộp, kể cả ngôn ngữ tiếng Anh và kỳ thi IELTS. Phần code API và giao diện cho chúng chưa có.
Đăng nhập chỉ để xác nhận phiên: hiện tại tài khoản chưa mở khóa tính năng nào, vì các bài học đều xem được không cần đăng nhập.
Chưa giới hạn số lần đăng nhập sai: có thể thêm express-rate-limit sau này nếu mở cho nhiều người dùng.
Còn 1 cảnh báo lint trong public/jp/quiz-engine.js (biến fresh không dùng), không ảnh hưởng chạy.
Script start của server đòi file .env, nên chạy được ở máy nhưng sẽ lỗi nếu chạy ở nơi chỉ có biến môi trường (Vercel không dùng script này nên không bị ảnh hưởng).

## Thành phần

- `client/`: React và Vite. Trang chủ giới thiệu lộ trình, liên kết tới bài học, tra cứu và bài kiểm tra JLPT; hỗ trợ đăng ký, đăng nhập và xem phiên người dùng.
- `client/public/jp/`: bài học, tra cứu Kanji và bài kiểm tra JLPT N5 đến N1.
- `server/`: Express API, xác thực JWT và Prisma schema/migrations.
- `docker-compose.yml`: PostgreSQL và pgAdmin.

## Chạy ứng dụng
Bạn cần mở ứng dụng bằng địa chỉ mạng của máy tính, không dùng localhost trên điện thoại.
1. Cho điện thoại và máy tính dùng cùng Wi‑Fi.
2. Trong thư mục client, chạy:
   npm run dev -- --host 0.0.0.0
3. Tìm địa chỉ IPv4 của máy tính bằng ipconfig trong PowerShell, ví dụ 192.168.1.25.
4. Trên điện thoại, mở http://192.168.1.25:5173/jp/index.html.
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
