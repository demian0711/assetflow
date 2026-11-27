# AssetFlow

AssetFlow là ứng dụng nội bộ để quản lý thiết bị IT. Employee xin thiết bị và Admin duyệt, cấp phát, nhận thiết bị trả lại. Phiên bản hiện tại có đăng nhập, giao diện quản trị và màn hình tổng quan tài khoản lấy từ API.

## Yêu cầu

- .NET 10 SDK
- Node.js 22.14 trở lên và npm
- Docker có Docker Compose

## Chạy local từ Git Bash

Tại gốc repo, tạo cấu hình local, chạy PostgreSQL 17 và áp dụng migration.

```bash
node scripts/setup-env.mjs --add-jwt-key
docker compose up -d --wait db
dotnet tool restore
bash scripts/db-update.sh
```

Script tạo `.env` từ `.env.example`. Với `.env` đã có, cờ `--add-jwt-key` chỉ thêm khóa JWT nếu chưa có, giữ nguyên các giá trị PostgreSQL và demo. Lệnh chạy thường, không có cờ, giữ nguyên tệp đã tồn tại. Compose lưu dữ liệu trong named volume và mở PostgreSQL tại `127.0.0.1:5434`. Giữ mật khẩu PostgreSQL đã sinh khi dùng lại volume đó.

Để tạo tài khoản demo, đặt `DemoSeed__Enabled=true` trong `.env` sau khi áp dụng migration. Mở terminal thứ nhất tại gốc repo và chạy API.

```bash
bash scripts/dev-api.sh
```

Mở terminal thứ hai tại gốc repo và chạy frontend.

```bash
cd web
npm ci
npm run dev
```

Mở [AssetFlow](http://localhost:5173) rồi đăng nhập. API chạy tại `http://localhost:5080`. Vite dùng `strictPort` ở cổng `5173` và chuyển tiếp `/api` cùng `/health` vào API.

## Tài khoản demo local

Seed tạo các tài khoản Identity dưới đây, 4 danh mục và 24 thiết bị. Seed chạy khi bật cờ trong môi trường Development. Chạy lại sẽ giữ các tài khoản và thiết bị đã tạo.

| Vai trò | Email |
| --- | --- |
| Admin | `admin@assetflow.test` |
| Employee | `employee1@assetflow.test` |
| Employee | `employee2@assetflow.test` |

Các tài khoản dùng chung mật khẩu `DemoSeed__Password` trong `.env`. Xem mật khẩu trên máy bằng `grep '^DemoSeed__Password=' .env`. Seed dùng mật khẩu này khi tạo từng tài khoản lần đầu.

## Đăng nhập và kiểm tra API

- `POST /api/auth/login` nhận `email` và `password`, trả JWT có hạn 30 phút.
- `GET /api/auth/me` nhận header `Authorization: Bearer <token>` và trả thông tin tài khoản cho người có vai trò `Employee` hoặc `Admin`. Thiếu token hoặc token không hợp lệ trả 401. Token hợp lệ thiếu vai trò phù hợp trả 403.
- React giữ token trong bộ nhớ. Tải lại trang hoặc hết hạn sẽ đưa bạn về màn hình đăng nhập. Nút **Sign out** xóa token và cache TanStack Query.

```bash
curl -i http://localhost:5080/api/auth/me
curl -fsS http://localhost:5080/health/live
curl -fsS http://localhost:5080/health/ready
```

Lệnh đầu trả 401. Hai endpoint health trả 200 và `{"status":"healthy"}` khi API và PostgreSQL đang chạy. Nếu PostgreSQL dừng trong khi API còn chạy, liveness vẫn trả 200 và readiness trả 503.

## Build và kiểm tra mã nguồn

Chạy các lệnh sau từ gốc repo.

```bash
dotnet build AssetFlow.slnx
cd web
npm ci
npm run lint
npm run typecheck
npm run build
```
