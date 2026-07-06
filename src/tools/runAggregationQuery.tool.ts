import { z } from "zod";
import { analyticsService } from "../services/analytics.service.js";
import { failure, sanitizeError, toMcpTextResponse } from "../utils/response.js";

const documentSchema = z.record(z.unknown());

export const runAggregationQueryTool = {
  name: "run_aggregation_query",
  title: "Run Aggregation Query",
  description: "Run a guarded read-only MongoDB aggregation against a catalog-defined collection.",
  inputSchema: {
    collectionName: z.string().min(1),
    pipeline: z.array(documentSchema).default([]),
    limit: z.number().int().positive().optional()
  },
  handler: async (args: {
    collectionName: string;
    pipeline: Record<string, unknown>[];
    limit?: number;
  }) => {
    try {
      const data = await analyticsService.runSafeAggregation(args);
      return toMcpTextResponse({ ok: true, data });
    } catch (error) {
      if (error instanceof Error && /not allowed|required|Limit|pipeline|projection|catalog|System collections/.test(error.message)) {
        return toMcpTextResponse(failure("GUARD_REJECTED", error.message));
      }

      return toMcpTextResponse(sanitizeError(error, "Unable to run aggregation query"));
    }
  }
};
