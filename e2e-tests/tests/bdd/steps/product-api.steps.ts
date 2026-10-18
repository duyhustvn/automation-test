import { createBdd } from 'playwright-bdd';
import { expect, APIResponse } from '@playwright/test';
import { getMongoCollection, getRedisClient, closeDbConnections } from '../../../utils/db';

const { Given, When, Then, AfterAll } = createBdd();

// Biến lưu trạng thái giữa các bước trong kịch bản
let lastResponse: APIResponse;
let currentProduct: { id: string; name: string; price: number };

AfterAll(async () => {
  // Dọn dẹp kết nối Database sau khi hoàn tất toàn bộ test suite
  await closeDbConnections();
});

// ============================================================================
// TC01: Health Check kiểm tra Server, MongoDB và Redis đều sẵn sàng
// ============================================================================
When('Tôi gửi yêu cầu GET tới {string}', async ({ request }, endpoint: string) => {
  lastResponse = await request.get(endpoint);
});

Then('Mã trạng thái phản hồi phải là {int}', async ({}, statusCode: number) => {
  expect(lastResponse.status()).toBe(statusCode);
});

Then('Trạng thái hệ thống phải là {string} với MongoDB và Redis sẵn sàng', async ({}, expectedStatus: string) => {
  const body = await lastResponse.json();
  expect(body.status).toBe(expectedStatus);
  expect(body.mongo).toBe(true);
  expect(body.redis).toBe(true);
});

// ============================================================================
// TC02: Tạo sản phẩm mới, kiểm tra đồng thời MongoDB và Redis
// ============================================================================
When('Tôi gửi yêu cầu tạo sản phẩm với ID {string}, tên {string}, giá {int}', async (
  { request },
  id: string,
  name: string,
  price: number
) => {
  // Dọn dẹp dữ liệu cũ (nếu có) để đảm bảo test có thể chạy lại nhiều lần (idempotent)
  const mongoCol = await getMongoCollection();
  await mongoCol.deleteOne({ _id: id });
  const redis = getRedisClient();
  await redis.del(`product:${id}`);

  currentProduct = { id, name, price };
  lastResponse = await request.post('/api/products', {
    data: currentProduct,
  });
});

Then('Dữ liệu sản phẩm trả về phải khớp với thông tin vừa tạo', async () => {
  const body = await lastResponse.json();
  expect(body.id).toBe(currentProduct.id);
  expect(body.name).toBe(currentProduct.name);
  expect(body.price).toBe(currentProduct.price);
});

Then('Sản phẩm với ID {string} phải tồn tại trong MongoDB với tên {string} và giá {int}', async (
  {},
  id: string,
  expectedName: string,
  expectedPrice: number
) => {
  const mongoCol = await getMongoCollection();
  const doc = await mongoCol.findOne({ _id: id });
  expect(doc).not.toBeNull();
  expect(doc?.name).toBe(expectedName);
  expect(doc?.price).toBe(expectedPrice);
});

Then('Sản phẩm với ID {string} phải tồn tại trong Redis cache và có TTL lớn hơn {int}', async (
  {},
  id: string,
  minTtl: number
) => {
  const redis = getRedisClient();
  const rawData = await redis.get(`product:${id}`);
  expect(rawData).not.toBeNull();
  const cached = JSON.parse(rawData!);
  expect(cached.id).toBe(id);

  const ttl = await redis.ttl(`product:${id}`);
  expect(ttl).toBeGreaterThan(minTtl);
});

// ============================================================================
// TC03: Kiểm tra cơ chế Cache Aside (Cache Hit và Cache Miss)
// ============================================================================
Given('Một sản phẩm đã tồn tại với ID {string}, tên {string}, giá {int}', async (
  { request },
  id: string,
  name: string,
  price: number
) => {
  // Dọn dẹp dữ liệu cũ trước khi nạp
  const mongoCol = await getMongoCollection();
  await mongoCol.deleteOne({ _id: id });
  const redis = getRedisClient();
  await redis.del(`product:${id}`);

  currentProduct = { id, name, price };
  lastResponse = await request.post('/api/products', { data: currentProduct });
  expect(lastResponse.status()).toBe(201);
});

When('Tôi gửi yêu cầu lấy thông tin sản phẩm với ID {string}', async ({ request }, id: string) => {
  lastResponse = await request.get(`/api/products/${id}`);
});

Then('Tiêu đề {string} trong phản hồi phải là {string}', async ({}, headerName: string, expectedVal: string) => {
  const headers = lastResponse.headers();
  expect(headers[headerName.toLowerCase()]).toBe(expectedVal);
});

When('Tôi xóa trực tiếp cache của sản phẩm {string} trong Redis', async ({}, id: string) => {
  const redis = getRedisClient();
  await redis.del(`product:${id}`);
  const check = await redis.get(`product:${id}`);
  expect(check).toBeNull();
});

Then('Sản phẩm {string} phải được tự động nạp lại vào Redis cache', async ({}, id: string) => {
  const redis = getRedisClient();
  const check = await redis.get(`product:${id}`);
  expect(check).not.toBeNull();
  const parsed = JSON.parse(check!);
  expect(parsed.id).toBe(id);
});

// ============================================================================
// TC04: Xóa sản phẩm và xác minh biến mất ở cả MongoDB và Redis
// ============================================================================
When('Tôi gửi yêu cầu xóa sản phẩm với ID {string}', async ({ request }, id: string) => {
  lastResponse = await request.delete(`/api/products/${id}`);
});

Then('Sản phẩm với ID {string} không còn tồn tại trong MongoDB', async ({}, id: string) => {
  const mongoCol = await getMongoCollection();
  const doc = await mongoCol.findOne({ _id: id });
  expect(doc).toBeNull();
});

Then('Cache của sản phẩm {string} không còn tồn tại trong Redis', async ({}, id: string) => {
  const redis = getRedisClient();
  const check = await redis.get(`product:${id}`);
  expect(check).toBeNull();
});
