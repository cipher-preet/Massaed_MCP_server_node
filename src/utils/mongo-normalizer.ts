import { ObjectId, type Document } from "mongodb";
import type { CollectionCatalogEntry } from "../types/catalog.types.js";

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

function fieldTypeForPath(fieldPath: string, metadata: CollectionCatalogEntry): string | undefined {
  const topLevelField = fieldPath.split(".")[0];
  return metadata.fields[topLevelField]?.type;
}

function normalizeObjectIdValue(value: unknown): unknown {
  if (typeof value === "string" && objectIdPattern.test(value)) {
    return new ObjectId(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeObjectIdValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const document = value as Document;
  if (typeof document.$oid === "string" && objectIdPattern.test(document.$oid)) {
    return new ObjectId(document.$oid);
  }

  return Object.fromEntries(
    Object.entries(document).map(([key, childValue]) => {
      if (key.startsWith("$")) {
        return [key, normalizeObjectIdValue(childValue)];
      }

      return [key, childValue];
    })
  );
}

function normalizeMatchDocument(match: Document, metadata: CollectionCatalogEntry): Document {
  return Object.fromEntries(
    Object.entries(match).map(([fieldName, value]) => {
      if (fieldName.startsWith("$")) {
        return [fieldName, value];
      }

      if (fieldTypeForPath(fieldName, metadata) === "objectId") {
        return [fieldName, normalizeObjectIdValue(value)];
      }

      return [fieldName, value];
    })
  );
}

export function normalizeFindFilter(filter: Document, metadata: CollectionCatalogEntry): Document {
  return normalizeMatchDocument(filter, metadata);
}

export function normalizeAggregationPipeline(pipeline: Document[], metadata: CollectionCatalogEntry): Document[] {
  return pipeline.map((stage) => {
    if (!stage.$match || typeof stage.$match !== "object" || Array.isArray(stage.$match)) {
      return stage;
    }

    return {
      ...stage,
      $match: normalizeMatchDocument(stage.$match as Document, metadata)
    };
  });
}
