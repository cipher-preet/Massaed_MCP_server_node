import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { RelationshipMap, SchemaCatalog } from "../types/catalog.types.js";

const catalogDir = dirname(fileURLToPath(import.meta.url));
const schemaCatalogPath = process.env.SCHEMA_CATALOG_PATH ?? join(catalogDir, "schema-catalog.json");
const relationshipMapPath = process.env.RELATIONSHIP_MAP_PATH ?? join(catalogDir, "relationship-map.json");

const fieldTypeSchema = z.enum(["string", "number", "boolean", "date", "objectId", "object", "array", "unknown", "mixed"]);
const operationSchema = z.enum(["find", "aggregate"]);
const relationTypeSchema = z.enum(["one-to-one", "one-to-many", "many-to-one", "many-to-many"]);

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function normalizeRelationType(value: unknown): unknown {
  if (value === "manyToOne") return "many-to-one";
  if (value === "oneToOne") return "one-to-one";
  if (value === "oneToMany") return "one-to-many";
  if (value === "manyToMany") return "many-to-many";
  if (value === "many_to_one") return "many-to-one";
  if (value === "one_to_one") return "one-to-one";
  if (value === "one_to_many") return "one-to-many";
  if (value === "many_to_many") return "many-to-many";
  return value;
}

function normalizeCollectionRelation(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const relation = value as Record<string, unknown>;
  const localField = relation.localField ?? relation.field;
  const foreignField = relation.foreignField ?? "_id";
  const targetCollection = relation.targetCollection ?? relation.collection ?? relation.toCollection ?? relation.target;

  return {
    ...relation,
    targetCollection,
    localField,
    foreignField,
    type: normalizeRelationType(relation.type),
    description:
      relation.description ??
      (typeof localField === "string" && typeof targetCollection === "string"
        ? `${localField} references ${targetCollection}.${foreignField}`
        : "Catalog relationship")
  };
}

const fieldSchema = z.object({
  type: fieldTypeSchema,
  description: z.string(),
  sensitive: z.boolean(),
  analytics: z.boolean()
});

const collectionRelationSchema = z.preprocess(
  normalizeCollectionRelation,
  z.object({
    targetCollection: z.string().min(1),
    localField: z.string().min(1),
    foreignField: z.string().min(1),
    type: relationTypeSchema,
    description: z.string()
  })
);

const projectionValueSchema = z.union([z.literal(0), z.literal(1)]);

const collectionSchema = z.object({
  description: z.string(),
  primaryKey: z.string().min(1),
  fields: z.record(fieldSchema),
  allowedOperations: z.array(operationSchema).nonempty(),
  defaultProjection: z.record(projectionValueSchema).optional(),
  relations: z.array(collectionRelationSchema)
});

const schemaCatalogSchema = z.object({
  collections: z.record(collectionSchema)
});

const relationshipEntrySchema = z.object({
  fromCollection: z.string().min(1),
  toCollection: z.string().min(1),
  localField: z.string().min(1),
  foreignField: z.string().min(1),
  type: relationTypeSchema,
  description: z.string()
});

const relationshipMapSchema = z.object({
  relations: z.array(z.preprocess(normalizeRelationshipEntry, relationshipEntrySchema))
});

function normalizeRelationshipEntry(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const relation = value as Record<string, unknown>;
  const fromCollection = relation.fromCollection ?? relation.source;
  const toCollection = relation.toCollection ?? relation.target;
  const localField = relation.localField ?? "_id";
  const foreignField = relation.foreignField ?? relation.foreignKey;
  const type = normalizeRelationType(relation.type ?? relation.relationship);

  return {
    ...relation,
    fromCollection,
    toCollection,
    localField,
    foreignField,
    type,
    description:
      relation.description ??
      (typeof fromCollection === "string" &&
      typeof toCollection === "string" &&
      typeof localField === "string" &&
      typeof foreignField === "string"
        ? `${fromCollection}.${localField} has ${toCollection}.${foreignField}`
        : "Catalog relationship")
  };
}

function validateCatalogReferences(catalog: SchemaCatalog, relationshipMap: RelationshipMap): void {
  const collectionNames = new Set(Object.keys(catalog.collections));

  for (const metadata of Object.values(catalog.collections)) {
    metadata.relations = metadata.relations.filter((relation) => collectionNames.has(relation.targetCollection));
  }

  relationshipMap.relations = relationshipMap.relations.filter(
    (relation) => collectionNames.has(relation.fromCollection) && collectionNames.has(relation.toCollection)
  );
}

export function loadSchemaCatalog(): SchemaCatalog {
  const catalog = schemaCatalogSchema.parse(readJsonFile(schemaCatalogPath));
  const relationshipMap = loadRelationshipMap();
  validateCatalogReferences(catalog, relationshipMap);
  return catalog;
}

export function loadRelationshipMap(): RelationshipMap {
  return relationshipMapSchema.parse(readJsonFile(relationshipMapPath));
}

