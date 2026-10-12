import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import path from 'path';

// Nạp file .env bằng tính năng native của Node.js
try {
  process.loadEnvFile(path.resolve(__dirname, '.env'));
} catch (e) {
  // Bỏ qua nếu file không tồn tại
}

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'steps/**/*.steps.ts',
  outputDir: '.features-gen',
});

export default defineConfig({
  testDir,
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false, // Chạy tuần tự để test DB / Cache nhất quán
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-bdd', open: 'never' }],
  ],
  use: {
    baseURL: process.env.API_BASE_URL || 'http://localhost:8088',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  },
});
