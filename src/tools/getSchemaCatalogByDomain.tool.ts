import { z } from "zod";
import { schemaService } from "../services/schema.service.js";
import { failure, toMcpTextResponse } from "../utils/response.js";

export const getSchemaCatalogByDomainTool = {
  name: "get_schema_catalog_by_domain",
  title: "Get Schema Catalog By Domain",
  description: "Return a domain-scoped schema catalog to reduce planner ambiguity and hallucination.",
  inputSchema: {
    domain: z.string().min(1).describe("Schema domain such as technician_hr, service_operations, customers_locations, finance_inventory, or general")
  },
  handler: async ({ domain }: { domain: string }) => {
    try {
      return toMcpTextResponse({
        ok: true,
        data: schemaService.getCatalogByDomain(domain)
      });
    } catch {
      return toMcpTextResponse(failure("SCHEMA_ERROR", "Unable to load domain schema catalog"));
    }
  }
};
