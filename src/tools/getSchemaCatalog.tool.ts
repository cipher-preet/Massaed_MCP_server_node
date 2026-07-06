import { schemaService } from "../services/schema.service.js";
import { failure, toMcpTextResponse } from "../utils/response.js";

export const getSchemaCatalogTool = {
  name: "get_schema_catalog",
  title: "Get Schema Catalog",
  description: "Return the full dynamic schema catalog used by this MCP gateway.",
  inputSchema: {},
  handler: async () => {
    try {
      return toMcpTextResponse({
        ok: true,
        data: schemaService.getCatalog()
      });
    } catch {
      return toMcpTextResponse(failure("SCHEMA_ERROR", "Unable to load schema catalog"));
    }
  }
};
