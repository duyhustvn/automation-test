import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();


When('Tôi gửi yêu cầu GET tới {string}', async ({ }, arg) => {
    // Step: When Tôi gửi yêu cầu GET tới "/health"
    // From: features/product-api.feature:4:5
});

Then('Mã trạng thái phản hồi phải là {int}', async ({ }, arg) => {
    // Step: Then Mã trạng thái phản hồi phải là 200
    // From: features/product-api.feature:5:5
});

Then('Trạng thái hệ thống phải là {string} với MongoDB và Redis sẵn sàng', async ({ }, arg) => {
    // Step: And Trạng thái hệ thống phải là "ok" với MongoDB và Redis sẵn sàng
    // From: features/product-api.feature:6:5
});

When('Tôi gửi yêu cầu tạo sản phẩm với ID {string}, tên {string}, giá {int}', async ({ }, arg, arg1, arg2) => {
    // Step: When Tôi gửi yêu cầu tạo sản phẩm với ID "prod_bdd_001", tên "Tai nghe BDD Sony", giá 6990000
    // From: features/product-api.feature:9:5
});

Then('Dữ liệu sản phẩm trả về phải khớp với thông tin vừa tạo', async ({ }) => {
    // Step: And Dữ liệu sản phẩm trả về phải khớp với thông tin vừa tạo
    // From: features/product-api.feature:11:5
});

Then('Sản phẩm với ID {string} phải tồn tại trong MongoDB với tên {string} và giá {int}', async ({ }, arg, arg1, arg2) => {
    // Step: And Sản phẩm với ID "prod_bdd_001" phải tồn tại trong MongoDB với tên "Tai nghe BDD Sony" và giá 6990000
    // From: features/product-api.feature:12:5
});

Then('Sản phẩm với ID {string} phải tồn tại trong Redis cache và có TTL lớn hơn {int}', async ({ }, arg, arg1) => {
    // Step: And Sản phẩm với ID "prod_bdd_001" phải tồn tại trong Redis cache và có TTL lớn hơn 0
    // From: features/product-api.feature:13:5
});

Given('Một sản phẩm đã tồn tại với ID {string}, tên {string}, giá {int}', async ({ }, arg, arg1, arg2) => {
    // Step: Given Một sản phẩm đã tồn tại với ID "prod_cache_bdd", tên "Chuột BDD MX Master", giá 2100000
    // From: features/product-api.feature:16:5
});

When('Tôi gửi yêu cầu lấy thông tin sản phẩm với ID {string}', async ({ }, arg) => {
    // Step: When Tôi gửi yêu cầu lấy thông tin sản phẩm với ID "prod_cache_bdd"
    // From: features/product-api.feature:17:5
});

Then('Tiêu đề {string} trong phản hồi phải là {string}', async ({ }, arg, arg1) => {
    // Step: And Tiêu đề "X-Cache" trong phản hồi phải là "HIT"
    // From: features/product-api.feature:19:5
});

When('Tôi xóa trực tiếp cache của sản phẩm {string} trong Redis', async ({ }, arg: string) => {
    // Step: When Tôi xóa trực tiếp cache của sản phẩm "prod_cache_bdd" trong Redis
    // From: features/product-api.feature:20:5
});

Then('Sản phẩm {string} phải được tự động nạp lại vào Redis cache', async ({ }, arg: string) => {
    // Step: And Sản phẩm "prod_cache_bdd" phải được tự động nạp lại vào Redis cache
    // From: features/product-api.feature:24:5
});

When('Tôi gửi yêu cầu xóa sản phẩm với ID {string}', async ({ }, arg: string) => {
    // Step: When Tôi gửi yêu cầu xóa sản phẩm với ID "prod_del_bdd"
    // From: features/product-api.feature:28:5
});

Then('Sản phẩm với ID {string} không còn tồn tại trong MongoDB', async ({ }, arg: string) => {
    // Step: And Sản phẩm với ID "prod_del_bdd" không còn tồn tại trong MongoDB
    // From: features/product-api.feature:30:5
});

Then('Cache của sản phẩm {string} không còn tồn tại trong Redis', async ({ }, arg: string) => {
    // Step: And Cache của sản phẩm "prod_del_bdd" không còn tồn tại trong Redis
    // From: features/product-api.feature:31:5
});

