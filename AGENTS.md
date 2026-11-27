# AssetFlow

- Backend dùng ASP.NET Core .NET 10 controllers trong `src/AssetFlow.Api`. Solution là `AssetFlow.slnx`. Chạy `bash scripts/dev-api.sh` để mở API tại `http://localhost:5080`.
- PostgreSQL 17 dùng EF Core 10 và Npgsql. Compose mở cổng `127.0.0.1:5434`. Tạo cấu hình local bằng `node scripts/setup-env.mjs --add-jwt-key`, khôi phục công cụ bằng `dotnet tool restore` và áp dụng migration bằng `bash scripts/db-update.sh`.
- Frontend dùng Vite, React, TypeScript, React Router, Ant Design và TanStack Query trong `web/`. Vite chạy tại `http://localhost:5173` và chuyển tiếp `/api`, `/health` tới API. Giữ nội dung UI bằng tiếng Anh.
- Backend dùng Identity để kiểm tra mật khẩu và JWT bearer cho API. Dùng policy `Employee` hoặc `Admin` cho API nghiệp vụ theo vai trò. React giữ JWT trong bộ nhớ và xóa cache TanStack Query khi kết thúc phiên.
- Build từ gốc repo bằng `dotnet build AssetFlow.slnx`. Trong `web/`, chạy `npm ci`, `npm run lint`, `npm run typecheck` và `npm run build`.
- Mục tiêu nghiệp vụ. Employee xin thiết bị. Admin duyệt, cấp phát và nhận thiết bị trả lại. Xem quy tắc chuyển trạng thái trong `docs/STATUS.md`.
- Mỗi lần chỉ làm phần được giao. Ghi tiến độ đã kiểm chứng vào `docs/STATUS.md`.
