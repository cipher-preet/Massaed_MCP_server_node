import { loadRelationshipMap, loadSchemaCatalog } from "../catalog/catalog.loader.js";
import type { CollectionCatalogEntry, RelationshipMap, SchemaCatalog } from "../types/catalog.types.js";

export class SchemaService {
  private readonly catalog: SchemaCatalog;
  private readonly relationshipMap: RelationshipMap;

  constructor() {
    this.catalog = loadSchemaCatalog();
    this.relationshipMap = loadRelationshipMap();
  }

  listCollections(): string[] {
    return Object.keys(this.catalog.collections).sort();
  }

  getCatalog(): SchemaCatalog {
    return this.catalog;
  }

  getRelationshipMap(): RelationshipMap {
    return this.relationshipMap;
  }

  describeCollection(collectionName: string): CollectionCatalogEntry {
    const metadata = this.catalog.collections[collectionName];

    if (!metadata) {
      throw new Error("Collection is not defined in the schema catalog");
    }

    return metadata;
  }
}

export const schemaService = new SchemaService();
