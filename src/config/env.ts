import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  MONGO_URI: z.string().min(1),
  MONGO_DB_NAME: z.string().min(1),
  MCP_SERVER_NAME: z.string().min(1).default("generic-erp-analytics"),
  MCP_SERVER_VERSION: z.string().min(1).default("1.0.0"),
  DEFAULT_QUERY_LIMIT: z.coerce.number().int().positive().default(50),
  MAX_QUERY_LIMIT: z.coerce.number().int().positive().default(500),
  MAX_TIME_MS: z.coerce.number().int().positive().default(10000)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.flatten().fieldErrors;
  throw new Error(`Invalid environment configuration: ${JSON.stringify(details)}`);
}

if (parsed.data.DEFAULT_QUERY_LIMIT > parsed.data.MAX_QUERY_LIMIT) {
  throw new Error("DEFAULT_QUERY_LIMIT must be less than or equal to MAX_QUERY_LIMIT");
}

export const env = parsed.data;
