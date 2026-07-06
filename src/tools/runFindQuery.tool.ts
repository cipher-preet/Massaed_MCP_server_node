import { z } from "zod";
import { analyticsService } from "../services/analytics.service.js";
import { failure, sanitizeError, toMcpTextResponse } from "../utils/response.js";

const documentSchema = z.record(z.unknown());

export const runFindQueryTool = {
  name: "run_find_query",
  title: "Run Find Query",
  description: "Run a guarded read-only MongoDB find query against a catalog-defined collection.",
  inputSchema: {
    collectionName: z.string().min(1),
    filter: documentSchema.default({}),
    projection: documentSchema.optional(),
    sort: documentSchema.optional(),
    limit: z.number().int().positive().optional()
  },
  handler: async (args: {
    collectionName: string;
    filter: Record<string, unknown>;
    projection?: Record<string, unknown>;
    sort?: Record<string, 1 | -1>;
    limit?: number;
  }) => {
    try {
      const data = await analyticsService.runSafeFind(args);
      return toMcpTextResponse({ ok: true, data });
    } catch (error) {
      if (error instanceof Error && /not allowed|required|Limit|projection|catalog|System collections/.test(error.message)) {
        return toMcpTextResponse(failure("GUARD_REJECTED", error.message));
      }

      return toMcpTextResponse(sanitizeError(error, "Unable to run find query"));
    }
  }
};
