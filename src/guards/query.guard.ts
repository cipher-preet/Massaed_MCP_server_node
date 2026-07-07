import type { Document } from "mongodb";
import { env } from "../config/env.js";
import { assertCollectionAllowed, assertOperationAllowed } from "./collection.guard.js";
import { normalizeLimit } from "./limit.guard.js";
import { aggregationHasLimit, assertNoBlockedOperators } from "./operator.guard.js";
import type { CollectionCatalogEntry, SchemaCatalog } from "../types/catalog.types.js";

export function assertReadOperation(operation: string): asserts operation is "find" | "aggregate" {
  if (operation !== "find" && operation !== "aggregate") {
    throw new Error("Only find and aggregate operations are allowed");
  }
}

function isAllowedAnalyticsField(fieldName: string, metadata: CollectionCatalogEntry): boolean {
  const topLevelField = fieldName.split(".")[0];
  const field = metadata.fields[topLevelField];
  return Boolean(field);
}

function buildSafeDefaultProjection(metadata: CollectionCatalogEntry): Document {
  if (metadata.defaultProjection && Object.keys(metadata.defaultProjection).length > 0) {
    return Object.fromEntries(
      Object.entries(metadata.defaultProjection).filter(([fieldName, enabled]) => {
        if (enabled === 0) {
          return true;
        }

        return isAllowedAnalyticsField(fieldName, metadata);
      })
    );
  }

  return Object.fromEntries(
    Object.entries(metadata.fields)
      .filter(([, field]) => field)
      .map(([fieldName]) => [fieldName, 1])
  );
}

function validateProjection(projection: Document | undefined, metadata: CollectionCatalogEntry): Document | undefined {
  if (!projection || Object.keys(projection).length === 0) {
    return buildSafeDefaultProjection(metadata);
  }

  for (const [fieldName, enabled] of Object.entries(projection)) {
    if (enabled === 0 || fieldName === "_id") {
      continue;
    }

    if (!isAllowedAnalyticsField(fieldName, metadata)) {
      throw new Error(`Field ${fieldName} is not allowed in analytics projection`);
    }
  }

  return projection;
}

function isProjectionExclusion(value: unknown): boolean {
  return value === 0 || value === false;
}

function isProjectionInclusion(value: unknown): boolean {
  return value === 1 || value === true;
}

function assertNoSensitiveBaseFieldReference(value: unknown, metadata: CollectionCatalogEntry): void {
  if (typeof value === "string") {
    if (!value.startsWith("$") || value.startsWith("$$")) {
      return;
    }

    const referencedField = value.slice(1).split(".")[0];
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => assertNoSensitiveBaseFieldReference(item, metadata));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  Object.values(value as Document).forEach((nestedValue) => assertNoSensitiveBaseFieldReference(nestedValue, metadata));
}

function validateAggregationProjection(project: Document, metadata: CollectionCatalogEntry): void {
  for (const [fieldName, expression] of Object.entries(project)) {
    if (isProjectionExclusion(expression) || fieldName === "_id") {
      continue;
    }

    if (isProjectionInclusion(expression)) {
      const topLevelField = fieldName.split(".")[0];
      const field = metadata.fields[topLevelField];

      if (field && !isAllowedAnalyticsField(fieldName, metadata)) {
        throw new Error(`Field ${fieldName} is not allowed in analytics projection`);
      }

      continue;
    }

    assertNoSensitiveBaseFieldReference(expression, metadata);
  }
}

function validateAggregationProjectionStages(pipeline: Document[], metadata: CollectionCatalogEntry): void {
  for (const stage of pipeline) {
    const project = stage.$project;
    if (!project || typeof project !== "object" || Array.isArray(project)) {
      continue;
    }

    validateAggregationProjection(project as Document, metadata);
  }
}

function stageChangesOutputShape(stage: Document): boolean {
  return Boolean(
    stage.$count ||
      stage.$group ||
      stage.$bucket ||
      stage.$bucketAuto ||
      stage.$facet ||
      stage.$replaceRoot ||
      stage.$replaceWith
  );
}

function shouldAppendDefaultAggregationProjection(pipeline: Document[]): boolean {
  const hasProject = pipeline.some((stage) => Object.prototype.hasOwnProperty.call(stage, "$project"));
  if (hasProject) {
    return false;
  }

  return !pipeline.some(stageChangesOutputShape);
}

export function guardFindQuery(args: {
  collectionName: string;
  filter: Document;
  projection?: Document;
  sort?: Document;
  limit?: number;
  catalog: SchemaCatalog;
}): { limit: number; projection?: Document } {
  assertReadOperation("find");
  assertCollectionAllowed(args.collectionName, args.catalog);
  assertOperationAllowed(args.collectionName, "find", args.catalog);
  assertNoBlockedOperators(args.filter);
  assertNoBlockedOperators(args.projection);
  assertNoBlockedOperators(args.sort);

  const metadata = args.catalog.collections[args.collectionName];
  const projection = validateProjection(args.projection, metadata);

  return {
    limit: normalizeLimit(args.limit),
    projection
  };
}

export function guardAggregationQuery(args: {
  collectionName: string;
  pipeline: Document[];
  limit?: number;
  catalog: SchemaCatalog;
}): { pipeline: Document[]; limit: number; maxTimeMS: number } {
  assertReadOperation("aggregate");
  assertCollectionAllowed(args.collectionName, args.catalog);
  assertOperationAllowed(args.collectionName, "aggregate", args.catalog);

  if (!Array.isArray(args.pipeline)) {
    throw new Error("pipeline must be an array");
  }

  assertNoBlockedOperators(args.pipeline);

  const limit = normalizeLimit(args.limit);
  const metadata = args.catalog.collections[args.collectionName];
  validateAggregationProjectionStages(args.pipeline, metadata);

  const pipelineWithProjection = shouldAppendDefaultAggregationProjection(args.pipeline)
    ? [...args.pipeline, { $project: buildSafeDefaultProjection(metadata) }]
    : args.pipeline;

  const guardedPipeline = aggregationHasLimit(pipelineWithProjection)
    ? pipelineWithProjection
    : [...pipelineWithProjection, { $limit: limit }];

  return {
    pipeline: guardedPipeline,
    limit,
    maxTimeMS: env.MAX_TIME_MS
  };
}
