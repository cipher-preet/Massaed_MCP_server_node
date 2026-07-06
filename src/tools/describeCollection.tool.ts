import { z } from "zod";
import { schemaService } from "../services/schema.service.js";
import { failure, toMcpTextResponse } from "../utils/response.js";

export const describeCollectionTool = {
  name: "describe_collection",
  title: "Describe Collection",
  description: "Return catalog metadata for one allowed collection.",
  inputSchema: {
    collectionName: z.string().min(1)
  },
  handler: async ({ collectionName }: { collectionName: string }) => {
    try {
      return toMcpTextResponse({
        ok: true,
        data: schemaService.describeCollection(collectionName)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to describe collection";
      return toMcpTextResponse(failure("COLLECTION_NOT_ALLOWED", message));
    }
  }
};
