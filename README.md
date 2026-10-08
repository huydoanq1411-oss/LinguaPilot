# JLPT N2→N1: Học tiếng Nhật từ 0 đến N1

Website học tiếng Nhật bằng tiếng Việt, đi từ bảng chữ cái Kana và kiến thức nền tảng đến ngữ pháp, từ vựng, Kanji và luyện thi JLPT N1. Dự án được xây dựng dưới dạng các trang HTML tĩnh, không cần cài đặt thư viện hay backend.

## Bắt đầu

Mở [`JP/index.html`](JP/index.html) bằng trình duyệt để vào trang chủ, sau đó chọn phần học hoặc công cụ cần dùng.

Có thể chạy qua máy chủ web cục bộ nếu muốn:

```bash
python -m http.server 8000
```

Chạy lệnh tại thư mục gốc repo rồi truy cập <http://localhost:8000/JP/>.

## Nội dung

### Lộ trình học

| Trang | Nội dung |
| --- | --- |
| [`phan01.html`](JP/phan01.html) | Kana và phát âm |
| [`phan02.html`](JP/phan02.html) | Ngữ pháp N5 |
| [`phan03.html`](JP/phan03.html) | Ngữ pháp, từ vựng và Kanji N4 |
| [`phan04.html`](JP/phan04.html) | Cầu nối N3→N2 và ngữ pháp trung cấp |
| [`phan05.html`](JP/phan05.html) | Hoàn thiện và mở rộng N2 |
| [`phan06.html`](JP/phan06.html) | N2 chuyên sâu |
| [`phan07.html`](JP/phan07.html) | Ngữ pháp N1 nền tảng |
| [`phan08.html`](JP/phan08.html) | N1 cơ bản và luyện đề |
| [`phan09.html`](JP/phan09.html) | N1 nâng cao |
| [`phan10.html`](JP/phan10.html) | N1 chuyên sâu và tổng ôn |

### Tra cứu và kiểm tra

- [`cau-truc-jlpt.html`](JP/cau-truc-jlpt.html): cấu trúc kỳ thi JLPT N5→N1 (thời gian, điểm đậu) kèm đường dẫn tới các bài cần học cho từng cấp.
- [`bang-chu-cai.html`](JP/bang-chu-cai.html): bảng Hiragana, Katakana và Kanji tham khảo.
- [`tra-kanji.html`](JP/tra-kanji.html): tra cứu Kanji.
- [`test-n5.html`](JP/test-n5.html), [`test-n4.html`](JP/test-n4.html), [`test-n3.html`](JP/test-n3.html), [`test-n2.html`](JP/test-n2.html), [`test-n1.html`](JP/test-n1.html): bài kiểm tra theo cấp độ.
- [`kiem-tra-thang-cap.html`](JP/kiem-tra-thang-cap.html): bài kiểm tra tổng hợp từ N5 đến N1.

## Tính năng

- Bài học có giải thích, ví dụ, flashcard và câu hỏi tương tác.
- Sau khi nộp quiz, có thể làm lại với bộ câu mới cùng cấp độ; ngân hàng được lưu cục bộ, không cần gọi API.
- Giao diện sáng/tối và điều hướng giữa các phần học.
- Đánh dấu tiến độ bài học; dữ liệu tiến độ được lưu cục bộ trong trình duyệt khi tính năng lưu trữ khả dụng.
- Bảng tra cứu hỗ trợ phát âm bằng chức năng tổng hợp giọng nói của trình duyệt nếu được hỗ trợ.
- Giao diện tiếng Việt, bố cục thích ứng với màn hình nhỏ.

## Công nghệ

HTML, CSS và JavaScript thuần; nội dung và mã tương tác được đặt trực tiếp trong các trang HTML. Không có bước build. Một số kiểu chữ được tải từ Google Fonts khi có kết nối mạng; trang có font dự phòng nếu không tải được.

### Cập nhật ngân hàng quiz

Sau khi thêm/sửa câu hỏi trong các trang `JP/*.html`, tạo lại ngân hàng dùng chung bằng Windows PowerShell tại thư mục gốc:

```powershell
Get-Content .\JP\build-quiz-bank.ps1 -Raw -Encoding UTF8 | Invoke-Expression
```