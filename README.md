# Dự án Demo: Backend REST API (Golang) + Automation Test (Playwright) có kiểm tra MongoDB & Redis

Dự án này minh họa cách xây dựng một hệ thống backend chuẩn mực bằng **Golang**, tích hợp cơ sở dữ liệu **MongoDB** và bộ nhớ đệm **Redis (Cache-Aside pattern)** có xác thực (authentication), đồng thời áp dụng **Playwright** để viết bộ kiểm thử tự động hóa (E2E API Test) xác thực cả tầng HTTP lẫn tính toàn vẹn trạng thái trực tiếp trong Database & Cache.

---

## 1. Thông tin xác thực & Môi trường

Cả **MongoDB** và **Redis** đều được cấu hình với mật khẩu `changeme` thông qua [`docker-compose.yml`](docker-compose.yml):

| Dịch vụ | Host / Port | Username | Password | Auth Source / DB |
| :--- | :--- | :--- | :--- | :--- |
| **MongoDB** | `localhost:27017` | `admin` | `changeme` | `admin` (Data DB: `inventory_db`) |
| **Redis** | `localhost:6379` | *(default)* | `changeme` | - |
| **Golang API**| `http://localhost:8088` | - | - | - |

---

## 2. Cấu trúc thư mục

```
automation-test/
├── .gitignore                  # Bỏ qua binary, node_modules, reports, .env...
├── docker-compose.yml          # Dựng container MongoDB và Redis (kèm password changeme)
├── main.go                     # Mã nguồn Golang REST API (Gin + Mongo + Redis)
├── go.mod / go.sum             # Go dependencies
├── README.md                   # Hướng dẫn chi tiết
└── e2e-tests/                  # Bộ Automation Test bằng Playwright
    ├── package.json
    ├── playwright.config.ts    # Cấu hình Playwright Test Runner
    ├── .env.example            # File mẫu cấu hình môi trường
    ├── utils/
    │   └── db.ts               # Helper kết nối trực tiếp MongoDB & Redis trong test
    └── tests/
        └── product-api.spec.ts # Kịch bản kiểm thử API + Verify DB & Redis
```

---

## 3. Nội dung `docker-compose.yml`

```yaml
services:
  mongodb:
    image: mongo:7
    container_name: test-mongo
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: changeme
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    container_name: test-redis
    command: redis-server --requirepass changeme
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongo_data:
  redis_data:
```

---

## 4. Luồng nghiệp vụ của Backend (Golang)

1. **`GET /health`**: Kiểm tra trạng thái kết nối tới MongoDB và Redis.
2. **`POST /api/products`**:
   - Nhận thông tin sản phẩm `{ id, name, price }`.
   - Lưu trữ bền vững vào **MongoDB** (collection `products`).
   - Ghi vào **Redis Cache** (`product:<id>`) với TTL = 10 phút.
3. **`GET /api/products/:id` (Cache-Aside Pattern)**:
   - **Lần 1 (Cache HIT):** Nếu có trong Redis, trả về ngay lập tức kèm header `X-Cache: HIT`.
   - **Lần 2 (Cache MISS):** Nếu Redis không có, truy vấn MongoDB, nạp lại vào Redis rồi trả về kết quả kèm header `X-Cache: MISS`.
4. **`DELETE /api/products/:id`**:
   - Xóa tài liệu khỏi MongoDB.
   - Xóa key khỏi Redis Cache.

---

## 5. Kịch bản Automation Test (Playwright)

Bộ kiểm thử trong [`e2e-tests/tests/product-api.spec.ts`](e2e-tests/tests/product-api.spec.ts) gồm 4 Test Case cốt lõi:

* **TC01 - Health Check:** Gọi `GET /health`, kiểm tra status 200, Mongo & Redis sẵn sàng.
* **TC02 - POST /api/products (API + State Verification):**
  1. Gửi request tạo sản phẩm qua Playwright `request.post`.
  2. Xác minh status code 201 và JSON trả về.
  3. **Direct Mongo Assert:** Kết nối trực tiếp vào MongoDB qua driver `mongodb` (với tài khoản `admin:changeme`), truy vấn document vừa tạo và so khớp `name`, `price`.
  4. **Direct Redis Assert:** Kết nối trực tiếp vào Redis qua `ioredis` (với auth `changeme`), kiểm tra key `product:<id>` tồn tại và kiểm tra TTL > 0.
* **TC03 - GET Cache Hit / Miss:**
  1. Gọi GET lần 1 -> Assert `X-Cache: HIT`.
  2. Xóa trực tiếp key trong Redis bằng test suite (`redis.del`).
  3. Gọi GET lần 2 -> Assert `X-Cache: MISS`.
  4. Kiểm tra Redis đã được backend tự động nạp lại (repopulated) sau khi query MongoDB.
* **TC04 - DELETE Product:**
  1. Gọi API xóa sản phẩm.
  2. Kiểm tra trực tiếp MongoDB xem record đã biến mất (`null`).
  3. Kiểm tra trực tiếp Redis xem cache đã được dọn sạch (`null`).

---

## 6. Hướng dẫn chạy thử nghiệm

### Bước 1: Khởi động MongoDB & Redis
```bash
docker compose up -d
```

### Bước 2: Chạy Server Golang
Server đã được cấu hình mặc định mật khẩu `changeme`:
```bash
go run main.go
# hoặc build binary rồi chạy:
# go build -o server main.go && ./server
```

### Bước 3: Chạy bộ Automation Test bằng Playwright
```bash
cd e2e-tests
npm install
npm test
```

### Xem báo cáo HTML trực quan:
```bash
npm run report
```
