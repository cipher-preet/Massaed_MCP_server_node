import { z } from "zod";
import { schemaService } from "../services/schema.service.js";
import { failure, toMcpTextResponse } from "../utils/response.js";

export const getRelationshipMapByDomainTool = {
  name: "get_relationship_map_by_domain",
  title: "Get Relationship Map By Domain",
  description: "Return only relationships between collections in the requested schema domain.",
  inputSchema: {
    domain: z.string().min(1).describe("Schema domain such as technician_hr, service_operations, customers_locations, finance_inventory, or general")
  },
  handler: async ({ domain }: { domain: string }) => {
    try {
      return toMcpTextResponse({
        ok: true,
        data: schemaService.getRelationshipMapByDomain(domain)
      });
    } catch {
      return toMcpTextResponse(failure("SCHEMA_ERROR", "Unable to load domain relationship map"));
    }
  }
};
