import { test, expect } from '@playwright/test';
import { getMongoCollection, getRedisClient, closeDbConnections } from '../utils/db';
import { Collection, Document } from 'mongodb';
import Redis from 'ioredis';

test.describe('E2E Backend API Automation Test with MongoDB & Redis Validation', () => {
  let mongoCol: Collection<Document>;
  let redis: Redis;

  test.beforeAll(async () => {
    mongoCol = await getMongoCollection();
    redis = getRedisClient();
  });

  test.afterAll(async () => {
    // Dọn dẹp kết nối sau khi toàn bộ test hoàn tất
    await closeDbConnections();
  });

  test('TC01 - [Health Check] Server, MongoDB và Redis đều sẵn sàng', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.mongo).toBe(true);
    expect(body.redis).toBe(true);
  });

  test('TC02 - [POST /api/products] Tạo sản phẩm, kiểm tra đồng thời MongoDB và Redis', async ({ request }) => {
    const testProduct = {
      id: `prod_test_${Date.now()}`,
      name: 'Tai nghe Sony WH-1000XM5',
      price: 6990000,
    };

    // 1. Gọi REST API tạo mới sản phẩm
    const res = await request.post('/api/products', {
      data: testProduct,
    });

    // Assert 1: Kiểm tra phản hồi HTTP từ API
    expect(res.status()).toBe(201);
    const resBody = await res.json();
    expect(resBody.id).toBe(testProduct.id);
    expect(resBody.name).toBe(testProduct.name);
    expect(resBody.price).toBe(testProduct.price);

    // Assert 2: Truy vấn TRỰC TIẾP vào MongoDB để kiểm tra tính toàn vẹn dữ liệu
    const mongoDoc = await mongoCol.findOne({ _id: testProduct.id });
    expect(mongoDoc).not.toBeNull();
    expect(mongoDoc?.name).toBe(testProduct.name);
    expect(mongoDoc?.price).toBe(testProduct.price);

    // Assert 3: Truy vấn TRỰC TIẾP vào Redis để kiểm tra Cache
    const cachedRaw = await redis.get(`product:${testProduct.id}`);
    expect(cachedRaw).not.toBeNull();
    const cachedProduct = JSON.parse(cachedRaw!);
    expect(cachedProduct.id).toBe(testProduct.id);
    expect(cachedProduct.name).toBe(testProduct.name);

    // Assert 4: Kiểm tra Redis TTL (Time-To-Live > 0)
    const ttl = await redis.ttl(`product:${testProduct.id}`);
    expect(ttl).toBeGreaterThan(0);
  });

  test('TC03 - [GET /api/products/:id] Kiểm tra cơ chế Cache Aside (Cache Hit & Cache Miss)', async ({ request }) => {
    const testProduct = {
      id: `cache_test_${Date.now()}`,
      name: 'Chuột Logitech MX Master 3S',
      price: 2100000,
    };

    // Tạo sản phẩm ban đầu
    const postRes = await request.post('/api/products', { data: testProduct });
    expect(postRes.status()).toBe(201);

    // Lần 1: Gọi GET khi Redis đã có cache sẵn -> Kỳ vọng Cache HIT
    const getRes1 = await request.get(`/api/products/${testProduct.id}`);
    expect(getRes1.status()).toBe(200);
    expect(getRes1.headers()['x-cache']).toBe('HIT');

    // Giả lập Cache Eviction: Xóa key trong Redis
    await redis.del(`product:${testProduct.id}`);
    const redisCheck = await redis.get(`product:${testProduct.id}`);
    expect(redisCheck).toBeNull(); // Đảm bảo Redis đã sạch

    // Lần 2: Gọi GET sau khi xóa cache -> Backend phải query MongoDB rồi tái nạp Redis -> Kỳ vọng Cache MISS
    const getRes2 = await request.get(`/api/products/${testProduct.id}`);
    expect(getRes2.status()).toBe(200);
    expect(getRes2.headers()['x-cache']).toBe('MISS');

    // Kiểm tra Redis đã tự động được nạp lại dữ liệu sau lần gọi GET (Cache repopulation)
    const repopulatedCache = await redis.get(`product:${testProduct.id}`);
    expect(repopulatedCache).not.toBeNull();
    expect(JSON.parse(repopulatedCache!).name).toBe(testProduct.name);
  });

  test('TC04 - [DELETE /api/products/:id] Xóa sản phẩm và xác minh biến mất ở cả MongoDB và Redis', async ({ request }) => {
    const testProduct = {
      id: `del_test_${Date.now()}`,
      name: 'Bàn phím Akko 3087',
      price: 950000,
    };

    // Tạo trước
    await request.post('/api/products', { data: testProduct });

    // Gọi API xóa
    const delRes = await request.delete(`/api/products/${testProduct.id}`);
    expect(delRes.status()).toBe(200);

    // Kiểm tra MongoDB: không còn tồn tại
    const mongoDoc = await mongoCol.findOne({ _id: testProduct.id });
    expect(mongoDoc).toBeNull();

    // Kiểm tra Redis: key đã bị xóa
    const redisVal = await redis.get(`product:${testProduct.id}`);
    expect(redisVal).toBeNull();
  });
});
