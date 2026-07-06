import { schemaService } from "../services/schema.service.js";
import { failure, toMcpTextResponse } from "../utils/response.js";

export const listCollectionsTool = {
  name: "list_collections",
  title: "List Collections",
  description: "Return collection names that are explicitly defined in the schema catalog.",
  inputSchema: {},
  handler: async () => {
    try {
      return toMcpTextResponse({
        ok: true,
        data: {
          collections: schemaService.listCollections()
        }
      });
    } catch {
      return toMcpTextResponse(failure("SCHEMA_ERROR", "Unable to list catalog collections"));
    }
  }
};
