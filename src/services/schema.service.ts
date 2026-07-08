import { loadRelationshipMap, loadSchemaCatalog } from "../catalog/catalog.loader.js";
import type { CollectionCatalogEntry, RelationshipMap, SchemaCatalog } from "../types/catalog.types.js";

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  technician_hr: [
    "technician",
    "technicians",
    "employee",
    "employees",
    "user",
    "users",
    "designation",
    "designations",
    "role",
    "roles",
    "attendance",
    "leave",
    "salary",
    "branch",
    "branches",
    "break",
    "breaks",
    "staff"
  ],
  service_operations: [
    "service",
    "services",
    "ticket",
    "tickets",
    "complaint",
    "complaints",
    "job",
    "jobs",
    "visit",
    "visits",
    "schedule",
    "assignment",
    "assignments",
    "maintenance",
    "installation"
  ],
  customers_locations: [
    "client",
    "clients",
    "customer",
    "customers",
    "site",
    "sites",
    "area",
    "areas",
    "location",
    "locations",
    "address",
    "contact",
    "contacts",
    "branch",
    "branches"
  ],
  finance_inventory: [
    "invoice",
    "invoices",
    "payment",
    "payments",
    "sale",
    "sales",
    "purchase",
    "purchases",
    "product",
    "products",
    "inventory",
    "stock",
    "vendor",
    "vendors",
    "membership",
    "memberships",
    "benefit",
    "benefits"
  ]
};

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

  getCatalogByDomain(domain: string): SchemaCatalog {
    const collectionNames = this.collectionNamesForDomain(domain);
    if (collectionNames.length === 0 || domain === "general") {
      return this.compactCatalog();
    }

    return {
      collections: Object.fromEntries(
        collectionNames.map((collectionName) => [collectionName, this.catalog.collections[collectionName]])
      )
    };
  }

  getRelationshipMap(): RelationshipMap {
    return this.relationshipMap;
  }

  getRelationshipMapByDomain(domain: string): RelationshipMap {
    const collectionNames = new Set(this.collectionNamesForDomain(domain));
    if (collectionNames.size === 0 || domain === "general") {
      return { relations: [] };
    }

    return {
      relations: this.relationshipMap.relations.filter(
        (relation) => collectionNames.has(relation.fromCollection) && collectionNames.has(relation.toCollection)
      )
    };
  }

  describeCollection(collectionName: string): CollectionCatalogEntry {
    const metadata = this.catalog.collections[collectionName];

    if (!metadata) {
      throw new Error("Collection is not defined in the schema catalog");
    }

    return metadata;
  }

  private compactCatalog(): SchemaCatalog {
    return {
      collections: Object.fromEntries(
        Object.entries(this.catalog.collections).map(([collectionName, metadata]) => [
          collectionName,
          {
            description: metadata.description,
            primaryKey: metadata.primaryKey,
            fields: Object.fromEntries(
              Object.entries(metadata.fields).filter(([fieldName]) => fieldName === metadata.primaryKey)
            ),
            allowedOperations: metadata.allowedOperations,
            defaultProjection: metadata.defaultProjection,
            relations: []
          }
        ])
      )
    };
  }

  private collectionNamesForDomain(domain: string): string[] {
    const keywords = DOMAIN_KEYWORDS[domain] ?? [];
    const directMatches = Object.keys(this.catalog.collections).filter((collectionName) =>
      this.collectionMatchesDomain(collectionName, this.catalog.collections[collectionName], keywords)
    );
    return this.withRelatedCollections(directMatches).sort();
  }

  private collectionMatchesDomain(collectionName: string, metadata: CollectionCatalogEntry, keywords: string[]): boolean {
    if (keywords.length === 0) {
      return false;
    }

    const searchableText = [
      collectionName,
      metadata.description,
      ...Object.keys(metadata.fields),
      ...Object.values(metadata.fields).map((field) => field.description)
    ]
      .join(" ")
      .toLowerCase();

    return keywords.some((keyword) => searchableText.includes(keyword.toLowerCase()));
  }

  private withRelatedCollections(collectionNames: string[]): string[] {
    const selected = new Set(collectionNames);
    for (const relation of this.relationshipMap.relations) {
      if (selected.has(relation.fromCollection) || selected.has(relation.toCollection)) {
        selected.add(relation.fromCollection);
        selected.add(relation.toCollection);
      }
    }
    return [...selected].filter((collectionName) => Boolean(this.catalog.collections[collectionName]));
  }
}

export const schemaService = new SchemaService();
