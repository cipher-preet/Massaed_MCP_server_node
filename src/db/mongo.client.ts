import { Db, MongoClient } from "mongodb";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) {
    return db;
  }

  client = new MongoClient(env.MONGO_URI, {
    appName: env.MCP_SERVER_NAME,
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 10000
  });

  try {
    await client.connect();
    db = client.db(env.MONGO_DB_NAME);
    logger.info("Connected to MongoDB", { database: env.MONGO_DB_NAME });
    return db;
  } catch (error) {
    client = null;

    if (error instanceof Error && error.message.includes("querySrv")) {
      throw new Error(
        "MongoDB SRV DNS lookup failed. If you are using a mongodb+srv Atlas URI, verify DNS/network access or use the non-SRV mongodb:// connection string from Atlas."
      );
    }

    throw error;
  }
}

export function getDb(): Db {
  if (!db) {
    throw new Error("MongoDB is not connected. Call connectMongo() before getDb().");
  }

  return db;
}

export async function closeMongo(): Promise<void> {
  if (!client) {
    return;
  }

  await client.close();
  client = null;
  db = null;
  logger.info("MongoDB connection closed");
}
