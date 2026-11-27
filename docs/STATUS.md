# Tiến độ AssetFlow

## Nền tảng đã kiểm chứng ngày 2026-11-27

Đã kiểm tra trên Windows với Git Bash, .NET SDK 10.0.404, Node.js 22.14.0 và npm 10.9.2.

| Kiểm tra | Kết quả |
| --- | --- |
| `dotnet sln AssetFlow.slnx list` | Có project `src/AssetFlow.Api/AssetFlow.Api.csproj`. |
| `dotnet build AssetFlow.slnx` | Thành công với 0 cảnh báo và 0 lỗi. |
| `npm ci` trong `web/` | Cài dependencies từ `package-lock.json`. |
| `npm run lint`, `npm run typecheck` và `npm run build` trong `web/` | Đều thành công. Vite tạo `web/dist/`. |
| `GET http://localhost:5080/health/live` và `GET http://localhost:5173/health/live` | Cả hai trả HTTP 200 và `{"status":"healthy"}`. |
| `GET http://localhost:5173/api/smoke-check` | Proxy chuyển tiếp. API trả HTTP 404 cho đường dẫn chưa triển khai. |
| Màn hình kiểm tra kết nối của chặng nền tảng trong Chrome headless | Hiển thị **API connected** khi API chạy và **API unavailable** sau khi dừng API rồi tải lại trang. |
| Khởi động Vite khi cổng 5173 đã được dùng | Vite từ chối khởi động với `strictPort`. |

## PostgreSQL đã kiểm chứng ngày 2026-11-27

Đã dùng PostgreSQL 17.12 chạy trực tiếp trên Windows tại `127.0.0.1:5434`. CLI Compose độc lập xác thực cấu hình. Máy kiểm tra thiếu Docker Engine để khởi động container.

| Lệnh hoặc kiểm tra | Kết quả |
| --- | --- |
| `docker-compose.exe config --quiet` và `docker-compose.exe config --services` | Cấu hình hợp lệ và có service `db`. |
| `node scripts/setup-env.mjs` | Tạo `.env` lần đầu. Lần tiếp theo giữ nguyên từng byte. |
| `dotnet tool restore` | Khôi phục công cụ local `dotnet-ef` 10.0.15. |
| `dotnet build AssetFlow.slnx` | Thành công với 0 cảnh báo và 0 lỗi. |
| `dotnet ef migrations has-pending-model-changes --project src/AssetFlow.Api` | Model khớp migration snapshot. |
| `bash scripts/db-update.sh` hai lần | Áp dụng `20261127135055_InitialCreate` trên database trống. Lần thứ hai báo schema đã cập nhật. |
| `bash scripts/dev-api.sh` với `DemoSeed__Enabled=false` | API khởi động. `psql` đếm được 0 tài khoản, 0 danh mục, 0 thiết bị. |
| `bash scripts/dev-api.sh` hai lần với `DemoSeed__Enabled=true`, dừng API giữa hai lần | Mỗi lần đều có 1 Admin, 2 Employee, 4 danh mục và 24 thiết bị Available với mã riêng. ID người dùng và hash mật khẩu giữ nguyên. |
| Kiểm tra ràng buộc bằng `psql` | PostgreSQL từ chối mã thiết bị trùng, khóa ngoại danh mục sai và mục đích yêu cầu dài 501 ký tự. |
| Kiểm tra `/health/live` và `/health/ready` trên cổng 5080 | Readiness trả 200 khi PostgreSQL chạy. Khi PostgreSQL dừng, liveness trả 200 và readiness trả 503. |

## Đăng nhập và giao diện quản trị đã kiểm chứng ngày 2026-11-27

Đã chạy API với dữ liệu Identity demo trong PostgreSQL 17.12 tạm và kiểm tra giao diện bằng Chrome headless trên cả Vite dev và bản build production. Các dịch vụ thử nghiệm dùng cổng riêng để giữ phiên API Debug đang chạy.

| Lệnh hoặc kiểm tra | Kết quả |
| --- | --- |
| `node scripts/setup-env.mjs --add-jwt-key` hai lần trên `.env` cũ | Lần đầu thêm khóa JWT local. Lần hai giữ nguyên tệp. |
| `dotnet build AssetFlow.slnx -c Release` | Thành công với 0 cảnh báo và 0 lỗi. Tiến trình API Debug đang giữ tệp thực thi của cấu hình Debug. |
| `npm run lint`, `npm run typecheck` và `npm run build` trong `web/` | Đều thành công. Vite tách bundle cho màn hình đăng nhập và app shell. |
| `POST /api/auth/login` và `GET /api/auth/me` | Admin và Employee đăng nhập được. `/me` trả đúng email, vai trò và ngày tạo tài khoản. Mật khẩu sai và email không tồn tại trả cùng thông báo 401. Email sai định dạng trả 400. |
| Gọi `GET /api/auth/me` với các trạng thái xác thực | Thiếu JWT, JWT không hợp lệ hoặc hết hạn trả 401. Tài khoản thử thiếu vai trò phù hợp trả 403. Phản hồi lỗi dùng ProblemDetails. |
| Chrome ở 1440px | Kiểm tra focus bàn phím, lỗi dưới trường, trạng thái đang đăng nhập và hồ sơ trong header và Overview. Đăng xuất rồi chuyển tài khoản lấy dữ liệu mới. Tải lại trang hoặc mô phỏng qua hạn 30 phút đều đưa về trang đăng nhập. |
| Chrome ở 390px | Form và app shell vừa khung màn hình. Drawer mở được, liên kết Overview đóng drawer và nút Sign out đưa về trang đăng nhập. |

Xem [README](../README.md) để chạy lại trên máy local. Màn hình Overview hiển thị dữ liệu tài khoản. Dashboard nghiệp vụ sẽ được triển khai khi API có dữ liệu.

## Quy tắc chuyển trạng thái cho chặng nghiệp vụ

- Yêu cầu bắt đầu ở `Pending`. Admin có thể duyệt sang `Approved` hoặc từ chối sang `Rejected`. Employee có thể hủy yêu cầu của mình từ `Pending` hoặc `Approved` trước khi cấp phát.
- Khi cấp phát yêu cầu `Approved`, Admin chọn thiết bị `Available` đúng danh mục. Trong cùng transaction, chuyển yêu cầu sang `Issued` và thiết bị sang `InUse`. Database cho phép một yêu cầu `Issued` trên mỗi thiết bị.
- Khi nhận trả, Admin chuyển yêu cầu sang `Returned` và thiết bị sang `Available` trong cùng transaction. Giữ tham chiếu thiết bị trong yêu cầu đã trả để lưu lịch sử.
- Admin có thể chuyển thiết bị `Available` sang `Retired`. Thiết bị `Retired` và yêu cầu `Rejected`, `Cancelled` hoặc `Returned` đã ở trạng thái cuối.
