import { schemaService } from "../services/schema.service.js";
import { failure, toMcpTextResponse } from "../utils/response.js";

export const getRelationshipMapTool = {
  name: "get_relationship_map",
  title: "Get Relationship Map",
  description: "Return all catalog-defined relationships between allowed collections.",
  inputSchema: {},
  handler: async () => {
    try {
      return toMcpTextResponse({
        ok: true,
        data: schemaService.getRelationshipMap()
      });
    } catch {
      return toMcpTextResponse(failure("SCHEMA_ERROR", "Unable to load relationship map"));
    }
  }
};
