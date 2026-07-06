import type { Document, Sort } from "mongodb";
import { getDb } from "../db/mongo.client.js";
import { getMaxTimeMS } from "../guards/limit.guard.js";
import { guardAggregationQuery, guardFindQuery } from "../guards/query.guard.js";
import { schemaService } from "./schema.service.js";

export class AnalyticsService {
  async runSafeFind(args: {
    collectionName: string;
    filter: Document;
    projection?: Document;
    sort?: Document;
    limit?: number;
  }): Promise<Document[]> {
    const catalog = schemaService.getCatalog();
    const guarded = guardFindQuery({ ...args, catalog });

    return getDb()
      .collection(args.collectionName)
      .find(args.filter, {
        projection: guarded.projection,
        limit: guarded.limit,
        maxTimeMS: getMaxTimeMS()
      })
      .sort((args.sort ?? {}) as Sort)
      .toArray();
  }

  async runSafeAggregation(args: {
    collectionName: string;
    pipeline: Document[];
    limit?: number;
  }): Promise<Document[]> {
    const catalog = schemaService.getCatalog();
    const guarded = guardAggregationQuery({ ...args, catalog });

    return getDb()
      .collection(args.collectionName)
      .aggregate(guarded.pipeline, {
        allowDiskUse: false,
        maxTimeMS: guarded.maxTimeMS
      })
      .toArray();
  }
}

export const analyticsService = new AnalyticsService();
