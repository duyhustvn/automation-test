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
Server đã được cấu hình mặc định mật khẩu `changeme`:
```bash
go run main.go
# hoặc:
# ./server
```

### Bước 3: Chạy Kiểm thử

Di chuyển vào thư mục test:
```bash
cd e2e-tests
```

#### Cách 1: Chạy bộ test Playwright chuẩn (Code-first)
```bash
npm test
# Xem báo cáo HTML:
npm run report
```

#### Cách 2: Chạy bộ test Playwright BDD (Gherkin)
```bash
npm run test:bdd
# Xem báo cáo HTML của BDD:
npm run report:bdd
```

#### Chạy giao diện tương tác UI Mode cho BDD:
```bash
npm run test:bdd:ui
```
