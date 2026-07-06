import type { SchemaCatalog } from "../types/catalog.types.js";

const SYSTEM_COLLECTION_PREFIXES = ["system.", "admin.", "local.", "config."];

export function assertCollectionAllowed(collectionName: string, catalog: SchemaCatalog): void {
  if (!collectionName || typeof collectionName !== "string") {
    throw new Error("collectionName is required");
  }

  if (SYSTEM_COLLECTION_PREFIXES.some((prefix) => collectionName.startsWith(prefix))) {
    throw new Error("System collections are not allowed");
  }

  if (!catalog.collections[collectionName]) {
    throw new Error("Collection is not defined in the schema catalog");
  }
}

export function assertOperationAllowed(
  collectionName: string,
  operation: "find" | "aggregate",
  catalog: SchemaCatalog
): void {
  const metadata = catalog.collections[collectionName];

  if (!metadata.allowedOperations.includes(operation)) {
    throw new Error(`Operation ${operation} is not allowed for collection ${collectionName}`);
  }
}
