# Dự án Demo: Backend REST API (Golang) + Automation Test (Playwright & Playwright BDD)

Dự án này minh họa cách xây dựng một hệ thống backend chuẩn mực bằng **Golang**, tích hợp cơ sở dữ liệu **MongoDB** và bộ nhớ đệm **Redis (Cache-Aside pattern)** có xác thực (authentication), đồng thời cung cấp song song **2 phong cách viết Automation Test** để bạn so sánh:
1. **Playwright Chuẩn (Code-first / `.spec.ts`):** Viết trực tiếp mã TypeScript kiểm thử nhanh chóng và cô đọng.
2. **Playwright BDD (Behavior-Driven Development / Gherkin `.feature`):** Viết kịch bản bằng ngôn ngữ tự nhiên để BA, PO, QA và Dev đều hiểu được, sau đó sinh mã và chạy bằng chính Playwright Test Runner.

---

## 1. Thông tin xác thực & Môi trường

Cả **MongoDB** và **Redis** đều được cấu hình với mật khẩu `changeme` thông qua [`docker-compose.yml`](docker-compose.yml):

| Dịch vụ | Host / Port | Username | Password | Auth Source / DB |
| :--- | :--- | :--- | :--- | :--- |
| **MongoDB** | `localhost:27017` | `admin` | `changeme` | `admin` (Data DB: `inventory_db`) |
| **Redis** | `localhost:6379` | *(default)* | `changeme` | - |
| **Golang API**| `http://localhost:8088` | - | - | - |

---

## 2. Cấu trúc thư mục dự án

```
automation-test/
├── .gitignore                      # Bỏ qua binary, node_modules, reports, .env...
├── docker-compose.yml              # Dựng container MongoDB và Redis (kèm password changeme)
├── main.go                         # Mã nguồn Golang REST API (Gin + Mongo + Redis)
├── go.mod / go.sum                 # Go dependencies
├── README.md                       # Hướng dẫn chi tiết
└── e2e-tests/                      # Bộ Automation Test
    ├── package.json                # Dependencies & scripts chạy test
    ├── .env.example                # File mẫu cấu hình môi trường (committed)
    ├── .env                        # Biến môi trường kết nối API, Mongo, Redis (ignored)
    ├── playwright.config.ts        # Cấu hình Playwright chuẩn (chạy ./tests/standard)
    ├── playwright.bdd.config.ts    # Cấu hình Playwright BDD (chạy ./tests/bdd)
    │
    ├── utils/
    │   └── db.ts                   # Helper kết nối trực tiếp MongoDB & Redis trong test
    │
    └── tests/                      # Thư mục chứa toàn bộ kịch bản kiểm thử
        ├── standard/               # [PHONG CÁCH 1: PLAYWRIGHT CHUẨN]
        │   └── product-api.spec.ts # Kịch bản code-first truyền thống
        │
        └── bdd/                    # [PHONG CÁCH 2: PLAYWRIGHT BDD]
            ├── features/
            │   └── product-api.feature  # Kịch bản Gherkin (ngôn ngữ tự nhiên)
            └── steps/
                └── product-api.steps.ts # Step definitions thực thi các bước Gherkin
```

---

## 3. So sánh 2 phong cách kiểm thử

| Tiêu chí | 1. Playwright Chuẩn (`tests/standard/product-api.spec.ts`) | 2. Playwright BDD (`tests/bdd/features/` + `steps/`) |
| :--- | :--- | :--- |
| **Hình thức** | Viết trực tiếp `test('TC02', async ({ request }) => { ... })` | Viết kịch bản `Scenario: ... Given ... When ... Then` trong file `.feature`, sau đó map vào `steps/*.steps.ts`. |
| **Người đọc hiểu** | Chủ yếu là Dev và Automation QA biết đọc code. | Cả PO, BA, PM, Manual QA và khách hàng đều đọc và duyệt được kịch bản. |
| **Bộ máy thực thi** | Playwright Test Runner gốc (`@playwright/test`). | `playwright-bdd` biên dịch kịch bản rồi chạy trên **chính Playwright Test Runner gốc**. |
| **Báo cáo & Debug** | Đầy đủ UI Mode, Trace Viewer, HTML Report. | Giữ nguyên 100% UI Mode, Trace Viewer, HTML Report của Playwright, hiển thị chi tiết từng bước Given/When/Then. |
| **Phù hợp khi** | Team kỹ thuật muốn viết test nhanh, ít tầng trung gian. | Dự án Agile cần thống nhất kịch bản nghiệp vụ làm tài liệu sống (Living Documentation). |

---

## 4. Hướng dẫn chạy thử nghiệm

### Bước 1: Khởi động MongoDB & Redis
```bash
docker compose up -d
```

### Bước 2: Chạy Server Golang
Server đã được cấu hình mặc định kết nối tới MongoDB và Redis với mật khẩu `changeme`:
```bash
go run main.go
# hoặc nếu đã build binary:
# ./server
```

### Bước 3: Cài đặt và Chuẩn bị môi trường Test (Playwright)

> **Lưu ý về Playwright:** 
> - **Bạn KHÔNG CẦN cài đặt Playwright toàn cục (global) vào máy** (không cần `npm install -g @playwright/test`).
> - Playwright và các thư viện liên quan đã được khai báo trong `package.json`. Bạn chỉ cần cài đặt cục bộ cho dự án qua `npm install`.
> - Sau khi cài đặt, bạn có thể chạy Playwright thông qua các script cấu hình sẵn (`npm test`, `npm run ...`) hoặc chạy trực tiếp qua `npx playwright ...` (npx sẽ tự động tìm binary trong `node_modules`).

1. **Di chuyển vào thư mục test:**
   ```bash
   cd e2e-tests
   ```

2. **Cài đặt các thư viện Node.js (Dependencies):**
   ```bash
   npm install
   ```
   *Lệnh này sẽ cài đặt `@playwright/test`, `playwright-bdd`, `mongodb`, `ioredis`... vào thư mục `node_modules`.*

3. **Cài đặt Browser cho Playwright (Tùy chọn - Cần thiết khi dùng UI Mode / Headed Mode):**
   ```bash
   # Tải browser binaries (Chromium, Firefox, WebKit):
   npx playwright install

   # Hoặc trên môi trường Linux nếu thiếu các thư viện hệ thống đồ họa:
   npx playwright install --with-deps
   ```
   *(Ghi chú: Nếu bạn chỉ chạy kiểm thử API dạng headless qua dòng lệnh, Playwright dùng HTTP request nên không bắt buộc phải tải browser; tuy nhiên nếu muốn mở UI Mode trực quan thì cần chạy lệnh trên).*

4. **Tạo file cấu hình môi trường `.env` (tùy chọn nếu muốn tùy biến host/port):**
   ```bash
   cp .env.example .env
   ```

---

### Bước 4: Chạy Kiểm thử (Automation Test)

Bạn có thể chạy bằng lệnh `npm run ...` (ngắn gọn, khuyến nghị) hoặc dùng `npx` trực tiếp:

#### Phong cách 1: Playwright Chuẩn (Code-first)

- **Chạy toàn bộ test:**
  ```bash
  npm test
  # Hoặc chạy trực tiếp bằng npx:
  # npx playwright test
  ```
- **Chạy có mở trình duyệt (Headed mode):**
  ```bash
  npm run test:headed
  # Hoặc: npx playwright test --headed
  ```
- **Mở giao diện UI Mode tương tác:**
  ```bash
  npm run test:ui
  # Hoặc: npx playwright test --ui
  ```
- **Xem báo cáo kết quả HTML Report:**
  ```bash
  npm run report
  # Hoặc: npx playwright show-report
  ```

#### Phong cách 2: Playwright BDD (Gherkin Feature)

- **Chạy toàn bộ kịch bản BDD (tự động sinh mã qua `bddgen` và thực thi):**
  ```bash
  npm run test:bdd
  # Hoặc dùng npx:
  # npx bddgen -c playwright.bdd.config.ts && npx playwright test -c playwright.bdd.config.ts
  ```
- **Mở giao diện UI Mode tương tác cho BDD:**
  ```bash
  npm run test:bdd:ui
  ```
- **Xem báo cáo kết quả HTML Report của BDD:**
  ```bash
  npm run report:bdd
  # Hoặc: npx playwright show-report playwright-report-bdd
  ```

---

### 5. Bảng tổng hợp các lệnh nhanh (Scripts Cheatsheet)

| Lệnh npm | Lệnh tương đương qua npx | Mô tả |
| :--- | :--- | :--- |
| `npm install` | - | Cài đặt toàn bộ thư viện cần thiết vào dự án |
| `npx playwright install` | - | Tải browser binaries (Chromium, Firefox, WebKit) cho UI Mode |
| `npm test` | `npx playwright test` | Chạy bộ test Playwright chuẩn (headless) |
| `npm run test:headed` | `npx playwright test --headed` | Chạy test Playwright chuẩn có hiển thị trình duyệt |
| `npm run test:ui` | `npx playwright test --ui` | Mở Playwright UI Runner trực quan |
| `npm run report` | `npx playwright show-report` | Mở HTML Report của Playwright chuẩn |
| `npm run test:bdd` | `npx bddgen -c playwright.bdd.config.ts && npx playwright test -c ...` | Biên dịch file `.feature` và chạy bộ test BDD |
| `npm run test:bdd:ui` | `npx bddgen -c playwright.bdd.config.ts && npx playwright test -c ... --ui` | Mở Playwright UI Runner cho BDD |
| `npm run report:bdd` | `npx playwright show-report playwright-report-bdd` | Mở HTML Report của bộ test BDD |

