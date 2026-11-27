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

Xem [README](../README.md) để chạy lại trên máy local. Màn hình tài khoản hiện mang tên Account.

## Assets và Categories đã kiểm chứng ngày 2026-11-27

Assets là trang mặc định sau đăng nhập. Employee xem danh sách, tìm theo tên hoặc mã, lọc theo danh mục và trạng thái. Admin có thêm thao tác tạo, sửa thiết bị và danh mục, cùng thao tác retire thiết bị Available. API xử lý bộ lọc và phân trang trên PostgreSQL. Giao diện về trang 1 khi đổi bộ lọc và tải lại dữ liệu sau khi lưu.

| Lệnh hoặc kiểm tra | Kết quả |
| --- | --- |
| `dotnet build AssetFlow.slnx -c Release` | Thành công, 0 cảnh báo và 0 lỗi. |
| `dotnet ef migrations has-pending-model-changes --no-build --configuration Release --project src/AssetFlow.Api` | Model khớp migration snapshot. |
| `npm run lint`, `npm run typecheck` và `npm run build` trong `web/` | Đều thành công. |
| `node --test tests/assets.test.mjs` với API và seed trong PostgreSQL 17.12 tạm | Qua 2/2. Mã thiết bị trùng trả 409 kèm lỗi tại trường. Employee xem được danh sách và nhận 403 khi gọi API tạo thiết bị. |
| Kiểm tra API bổ sung | Xác nhận phân trang ổn định, tìm theo tên/mã, lọc kết hợp, validation 400, mã trùng khi sửa trả 409 và Employee nhận 403 ở mọi thao tác quản trị. Thiết bị InUse bị chặn đổi danh mục và retire. |
| Kiểm tra sau retire trên PostgreSQL | Thiết bị vẫn là bản ghi cũ với trạng thái Retired. Yêu cầu Returned trước đó vẫn liên kết với thiết bị và có đúng một audit event retire. |
| Chrome 1440px với bản build production | Skeleton, lỗi tải và Retry, reset trang khi lọc, trạng thái trống, thêm/sửa danh mục và thiết bị, validation cạnh trường, xác nhận retire và tải lại bảng đều hoạt động. |
| Chrome 390px với bản build production | Employee xem danh sách và dùng menu thu gọn. Bảng cuộn ngang trong vùng riêng, trang không tràn ngang. |

Để chạy lại hai kiểm thử HTTP, khởi động API local với dữ liệu demo theo [README](../README.md), sau đó chạy từ gốc repo.

```bash
node --env-file=.env --test tests/assets.test.mjs
```

## My Requests đã kiểm chứng ngày 2026-11-27

Employee tạo yêu cầu Pending, xem và lọc danh sách của mình trong My Requests. API lấy chủ sở hữu từ JWT và kiểm tra purpose từ 1 đến 500 ký tự. Chi tiết mở ngay sau khi tạo. Timeline hiển thị sự kiện đã lưu trong AuditEvents. Employee có thể hủy yêu cầu Pending hoặc Approved của mình.

| Lệnh hoặc kiểm tra | Kết quả |
| --- | --- |
| `dotnet build AssetFlow.slnx -c Release` | Thành công, 0 cảnh báo và 0 lỗi. |
| `dotnet ef migrations has-pending-model-changes --no-build --configuration Release --project src/AssetFlow.Api` | Model khớp migration snapshot. |
| `npm run lint`, `npm run typecheck` và `npm run build` trong `web/` | Đều thành công. |
| `node --test tests/assets.test.mjs tests/requests.test.mjs` với PostgreSQL 17.12 tạm | Qua 4/4. Employee A tạo được yêu cầu với purpose 500 ký tự và giữ quyền sở hữu khi body chứa ID của B. Employee B nhận 404 khi xem hoặc hủy yêu cầu đó. Purpose rỗng, toàn dấu cách hoặc 501 ký tự trả 400. |
| Kiểm tra hủy và audit trên PostgreSQL | Hai lần hủy đồng thời cho cùng một yêu cầu trả 200 và 409. Hủy lặp trả 409 và timeline chỉ có một sự kiện RequestCancelled. Yêu cầu Approved hủy được, Issued giữ nguyên trạng thái khi thử hủy. Audit lưu đúng Employee đã thao tác. |
| Chrome 1440px với bản build production | Xác nhận danh sách, ngày tạo, bộ lọc, validation cạnh trường, khóa Submit khi đợi phản hồi, chỉ gửi một POST, tự mở chi tiết và cập nhật timeline sau hủy. |
| Chrome 390px với bản build production | Menu thu gọn mở được My Requests. Employee B thấy danh sách trống và drawer New Request vừa khung. |

Để chạy lại test HTTP, dùng API kết nối database demo thử nghiệm. Bài test tạo và giữ lại một yêu cầu đã hủy để kiểm tra audit.

```bash
node --env-file=.env --test tests/requests.test.mjs
```

## Admin Requests và vòng đời cấp phát đã kiểm chứng ngày 2026-11-27

Admin duyệt nhu cầu hoặc từ chối có lý do, chọn thiết bị Available đúng danh mục để cấp, và xác nhận nhận trả. Các action POST lưu trạng thái yêu cầu, thay đổi kho liên quan và audit trong cùng transaction. Asset và AssetRequest dùng `xmin` hệ thống của PostgreSQL làm concurrency token. Employee thấy thiết bị đang cấp cho mình trong Assigned Assets. Yêu cầu Returned giữ tham chiếu thiết bị để xem lịch sử.

| Lệnh hoặc kiểm tra | Kết quả |
| --- | --- |
| `dotnet ef database update InitialCreate --no-build --configuration Release --project src/AssetFlow.Api`, sau đó `dotnet ef database update --no-build --configuration Release --project src/AssetFlow.Api` | Đã nâng cấp PostgreSQL 17.12 tạm lên `20261127150556_AddRequestLifecycle` và xác nhận dữ liệu có trước khi nâng cấp vẫn còn. Migration thêm `RejectionReason` và ánh xạ `xmin` sẵn có của PostgreSQL. |
| `dotnet ef migrations has-pending-model-changes --no-build --configuration Release --project src/AssetFlow.Api` | Model khớp migration snapshot. |
| `dotnet build AssetFlow.slnx -c Release` | Thành công, 0 cảnh báo và 0 lỗi. |
| `dotnet test tests/AssetFlow.IntegrationTests -c Release --no-build` | Qua 4/4 trên PostgreSQL thật. Kiểm tra sai danh mục, nhận trả lặp và giữ lịch sử, lý do từ chối bắt buộc, và cấp đồng thời cùng một thiết bị. |
| `Concurrent_issue_same_available_asset_after_both_reads_allows_exactly_one` | Interceptor giữ cả hai thao tác ngay trước khi ghi và xác nhận cả hai đã đọc Available với cùng `xmin`. Quan sát đúng một concurrency exception của EF Core, một HTTP 200 và một 409. PostgreSQL có đúng một yêu cầu Issued và một audit RequestIssued cho thiết bị. Yêu cầu còn lại vẫn Approved và chưa gán thiết bị. |
| `node --test tests/assets.test.mjs tests/requests.test.mjs` | Qua 4/4 với API chạy trên cùng PostgreSQL thử nghiệm. |
| `npm run lint`, `npm run typecheck` và `npm run build` trong `web/` | Đều thành công. |
| Chrome với bản build production | Kiểm tra hàng đợi và bộ lọc Admin, nhập lý do, duyệt, chọn thiết bị bằng mã và tên, thông báo khi nhận 409, tải lại dữ liệu, cấp và nhận trả. Đã kiểm tra Assigned Assets ở 390px trước và sau nhận trả. |

Để chạy lại integration test, đặt `ASSETFLOW_TEST_DB` thành chuỗi kết nối của một database PostgreSQL thử nghiệm riêng. Project test áp dụng migration, seed tài khoản thử và ghi dữ liệu fixture.

```bash
dotnet test tests/AssetFlow.IntegrationTests -c Release
```

Giới hạn hiện tại. Hàng đợi lọc trạng thái trên server và phân trang ở trình duyệt. Thay đổi ở phiên khác xuất hiện khi trang tải lại dữ liệu hoặc xử lý xung đột, chưa có cập nhật đẩy theo thời gian thực.

## Dashboard, Audit History và rà soát giao diện ngày 2026-11-27

Dashboard Admin đọc tổng thiết bị, Available, In use và yêu cầu Pending từ PostgreSQL. Biểu đồ danh mục ghi số lượng bên cạnh mỗi thanh. Employee thấy số liệu và hoạt động trên yêu cầu của mình. Audit History dành cho Admin, lọc theo email người thao tác, hành động và loại đối tượng. API phân trang và chỉ trả metadata của những loại sự kiện đã định nghĩa. Purpose, lý do từ chối và dữ liệu nhập tự do trong log nằm ngoài dữ liệu báo cáo.

| Lệnh hoặc kiểm tra | Kết quả |
| --- | --- |
| `dotnet build AssetFlow.slnx -c Release` | Thành công, 0 cảnh báo và 0 lỗi. |
| `dotnet ef migrations has-pending-model-changes --no-build --configuration Release --project src/AssetFlow.Api` | Model khớp migration snapshot. |
| `dotnet test tests/AssetFlow.IntegrationTests -c Release --no-build` | Qua 4/4 trên PostgreSQL 17.12 tạm, gồm kiểm thử cấp phát đồng thời. |
| `node --test --test-concurrency=1 tests/assets.test.mjs tests/requests.test.mjs tests/reporting.test.mjs` | Qua 5/5. Đối chiếu số Dashboard với dữ liệu PostgreSQL. Employee nhận 403 ở Audit History và dashboard của họ chỉ có sự kiện thuộc yêu cầu của họ. |
| `npm run lint`, `npm run typecheck` và `npm run build` trong `web/` | Đều thành công. |
| Trạng thái giao diện | Đã thấy Dashboard loading, lỗi 503 được giả lập và nút Retry tải lại thành công. Audit History áp dụng bộ lọc, phân trang, hiển thị trạng thái trống theo bộ lọc và xóa bộ lọc. Kiểm tra bổ sung xác nhận hai sự kiện fixture có metadata bất thường được loại khỏi báo cáo. |

Đã mở bản build production bằng Chrome headless ở 1440px và 390px, kết nối API thật và PostgreSQL có dữ liệu seed. Dữ liệu cho Recent Activity được tạo qua các thao tác yêu cầu và cấp phát trong phiên kiểm thử.

- Cả hai vai trò tại hai kích thước. Sign in, Dashboard, Assets và Account.
- Admin tại hai kích thước. Audit History, Categories, Admin Requests, chi tiết yêu cầu và các hộp thoại Add Asset, Add Category, Approve, Reject, Issue Asset, Receive Return.
- Admin tại 1440px. Edit Asset, Edit Category và xác nhận Retire.
- Employee tại hai kích thước. My Requests, chi tiết, New Request, xác nhận Cancel Request và Assigned Assets.
- Đã kiểm tra Tab trên form đăng nhập, Escape để đóng hộp thoại, nhãn các trường, contrast và console. Ở 390px menu mở được, form nằm trong khung và cuộn ngang được giới hạn trong bảng. Đã dùng phím mũi tên để cuộn bảng Assets.

Lượt Chrome cuối qua 49 màn hình và trạng thái. Console không có lỗi hoặc cảnh báo ngoài phản hồi 503 được giả lập có chủ đích. Sáu quy tắc axe về nhãn, tên điều khiển, contrast và vùng cuộn không báo vi phạm trong lượt này.

Audit History hiện hiển thị sự kiện vòng đời yêu cầu và retire thiết bị.

## Quy tắc chuyển trạng thái cho chặng nghiệp vụ

- Yêu cầu bắt đầu ở `Pending`. Admin có thể duyệt sang `Approved` hoặc từ chối sang `Rejected`. Employee có thể hủy yêu cầu của mình từ `Pending` hoặc `Approved` trước khi cấp phát.
- Khi cấp phát yêu cầu `Approved`, Admin chọn thiết bị `Available` đúng danh mục. Trong cùng transaction, chuyển yêu cầu sang `Issued` và thiết bị sang `InUse`. Database cho phép một yêu cầu `Issued` trên mỗi thiết bị.
- Khi nhận trả, Admin chuyển yêu cầu sang `Returned` và thiết bị sang `Available` trong cùng transaction. Giữ tham chiếu thiết bị trong yêu cầu đã trả để lưu lịch sử.
- Admin có thể chuyển thiết bị `Available` sang `Retired`. Thiết bị `Retired` và yêu cầu `Rejected`, `Cancelled` hoặc `Returned` đã ở trạng thái cuối.
