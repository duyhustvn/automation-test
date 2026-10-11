import { MongoClient, Collection, Document } from 'mongodb';
import Redis from 'ioredis';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:changeme@localhost:27017/?authSource=admin';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'changeme';

let mongoClient: MongoClient | null = null;
let redisClient: Redis | null = null;

export async function getMongoCollection(dbName = 'inventory_db', colName = 'products'): Promise<Collection<Document>> {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
  }
  return mongoClient.db(dbName).collection(colName);
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD || undefined,
      lazyConnect: false,
    });
  }
  return redisClient;
}

export async function closeDbConnections() {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
  }
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
