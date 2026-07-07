import type { Document, Sort } from "mongodb";
import { getDb } from "../db/mongo.client.js";
import { getMaxTimeMS } from "../guards/limit.guard.js";
import { guardAggregationQuery, guardFindQuery } from "../guards/query.guard.js";
import { schemaService } from "./schema.service.js";
import { normalizeAggregationPipeline, normalizeFindFilter } from "../utils/mongo-normalizer.js";

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
    const metadata = catalog.collections[args.collectionName];
    const filter = normalizeFindFilter(args.filter, metadata);

    return getDb()
      .collection(args.collectionName)
      .find(filter, {
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
    const metadata = catalog.collections[args.collectionName];
    const pipeline = normalizeAggregationPipeline(guarded.pipeline, metadata);

    return getDb()
      .collection(args.collectionName)
      .aggregate(pipeline, {
        allowDiskUse: false,
        maxTimeMS: guarded.maxTimeMS
      })
      .toArray();
  }
}

export const analyticsService = new AnalyticsService();
