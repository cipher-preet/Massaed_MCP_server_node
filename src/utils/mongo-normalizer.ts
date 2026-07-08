import { ObjectId, type Document } from "mongodb";
import type { CollectionCatalogEntry } from "../types/catalog.types.js";

const objectIdPattern = /^[a-fA-F0-9]{24}$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function fieldTypeForPath(fieldPath: string, metadata: CollectionCatalogEntry): string | undefined {
  const topLevelField = fieldPath.split(".")[0];
  return metadata.fields[topLevelField]?.type;
}

function normalizeExtendedMongoValue(value: unknown): unknown {
  if (value instanceof Date || value instanceof ObjectId) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeExtendedMongoValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const document = value as Document;
  if (typeof document.$oid === "string" && objectIdPattern.test(document.$oid)) {
    return new ObjectId(document.$oid);
  }

  if (typeof document.$date === "string" && isoDatePattern.test(document.$date)) {
    return new Date(document.$date);
  }

  return Object.fromEntries(
    Object.entries(document).map(([key, childValue]) => [key, normalizeExtendedMongoValue(childValue)])
  );
}

function normalizeObjectIdValue(value: unknown): unknown {
  if (value instanceof ObjectId) {
    return value;
  }

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

function objectIdSearchValues(value: unknown): [ObjectId, string] | null {
  if (value instanceof ObjectId) {
    return [value, value.toHexString()];
  }

  if (typeof value === "string" && objectIdPattern.test(value)) {
    return [new ObjectId(value), value];
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const document = value as Document;
  if (typeof document.$oid === "string" && objectIdPattern.test(document.$oid)) {
    return [new ObjectId(document.$oid), document.$oid];
  }

  return null;
}

function uniqueObjectIdSearchValues(values: unknown[]): unknown[] {
  const output: unknown[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const variants = objectIdSearchValues(value);
    const candidates = variants ? variants : [normalizeObjectIdValue(value)];

    for (const candidate of candidates) {
      const key = candidate instanceof ObjectId ? `objectId:${candidate.toHexString()}` : `${typeof candidate}:${String(candidate)}`;
      if (!seen.has(key)) {
        seen.add(key);
        output.push(candidate);
      }
    }
  }

  return output;
}

function normalizeObjectIdQueryValue(value: unknown): unknown {
  const directVariants = objectIdSearchValues(value);
  if (directVariants) {
    return { $in: directVariants };
  }

  if (Array.isArray(value)) {
    return value.map(normalizeObjectIdValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const document = value as Document;
  return Object.fromEntries(
    Object.entries(document).map(([key, childValue]) => {
      if (key === "$eq") {
        const variants = objectIdSearchValues(childValue);
        return variants ? ["$in", variants] : [key, normalizeObjectIdValue(childValue)];
      }

      if (key === "$in" && Array.isArray(childValue)) {
        return [key, uniqueObjectIdSearchValues(childValue)];
      }

      if (key === "$nin" && Array.isArray(childValue)) {
        return [key, uniqueObjectIdSearchValues(childValue)];
      }

      if (key.startsWith("$")) {
        return [key, normalizeObjectIdValue(childValue)];
      }

      return [key, childValue];
    })
  );
}

function normalizeDateValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" && isoDatePattern.test(value)) {
    return new Date(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeDateValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const document = value as Document;
  if (typeof document.$date === "string" && isoDatePattern.test(document.$date)) {
    return new Date(document.$date);
  }

  return Object.fromEntries(
    Object.entries(document).map(([key, childValue]) => {
      if (key.startsWith("$")) {
        return [key, normalizeDateValue(childValue)];
      }

      return [key, childValue];
    })
  );
}

function normalizeValueForField(value: unknown, fieldType: string | undefined): unknown {
  if (fieldType === "objectId") {
    return normalizeObjectIdQueryValue(value);
  }

  if (fieldType === "date") {
    return normalizeDateValue(value);
  }

  return value;
}

function normalizeMatchDocument(match: Document, metadata: CollectionCatalogEntry): Document {
  const extendedNormalizedMatch = normalizeExtendedMongoValue(match) as Document;

  return Object.fromEntries(
    Object.entries(extendedNormalizedMatch).map(([fieldName, value]) => {
      if (fieldName.startsWith("$")) {
        return [fieldName, value];
      }

      return [fieldName, normalizeValueForField(value, fieldTypeForPath(fieldName, metadata))];
    })
  );
}

export function normalizeFindFilter(filter: Document, metadata: CollectionCatalogEntry): Document {
  return normalizeMatchDocument(filter, metadata);
}

export function normalizeAggregationPipeline(pipeline: Document[], metadata: CollectionCatalogEntry): Document[] {
  const extendedNormalizedPipeline = normalizeExtendedMongoValue(pipeline) as Document[];

  return extendedNormalizedPipeline.map((stage) => {
    if (!stage.$match || typeof stage.$match !== "object" || Array.isArray(stage.$match)) {
      return stage;
    }

    return {
      ...stage,
      $match: normalizeMatchDocument(stage.$match as Document, metadata)
    };
  });
}
