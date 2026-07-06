export type AnalyticsFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "objectId"
  | "object"
  | "array"
  | "unknown"
  | "mixed";

export type AllowedOperation = "find" | "aggregate";

export type RelationType =
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "many-to-many";

export interface FieldMetadata {
  type: AnalyticsFieldType;
  description: string;
  sensitive: boolean;
  analytics: boolean;
}

export interface CollectionRelation {
  targetCollection: string;
  localField: string;
  foreignField: string;
  type: RelationType;
  description: string;
}

export interface CollectionCatalogEntry {
  description: string;
  primaryKey: string;
  fields: Record<string, FieldMetadata>;
  allowedOperations: AllowedOperation[];
  defaultProjection?: Record<string, 0 | 1>;
  relations: CollectionRelation[];
}

export interface SchemaCatalog {
  collections: Record<string, CollectionCatalogEntry>;
}

export interface RelationshipEntry {
  fromCollection: string;
  toCollection: string;
  localField: string;
  foreignField: string;
  type: RelationType;
  description: string;
}

export interface RelationshipMap {
  relations: RelationshipEntry[];
}
