import { env } from "../config/env.js";

export function normalizeLimit(limit?: number): number {
  if (limit === undefined || limit === null) {
    return env.DEFAULT_QUERY_LIMIT;
  }

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("Limit must be a positive integer");
  }

  return Math.min(limit, env.MAX_QUERY_LIMIT);
}

export function getMaxTimeMS(): number {
  return env.MAX_TIME_MS;
}
