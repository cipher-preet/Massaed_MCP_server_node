import type { StructuredError, StructuredResponse, StructuredSuccess } from "../types/common.types.js";
import { logger } from "./logger.js";

export function success<T>(data: T): StructuredSuccess<T> {
  return { ok: true, data };
}

export function failure(code: string, message: string, details?: unknown): StructuredError {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details })
    }
  };
}

export function sanitizeError(error: unknown, fallbackMessage = "Request failed"): StructuredError {
  if (error instanceof Error) {
    logger.error(error.message, { name: error.name, stack: error.stack });
    return failure("REQUEST_FAILED", fallbackMessage);
  }

  logger.error("Unknown error", { error });
  return failure("REQUEST_FAILED", fallbackMessage);
}

export function toMcpTextResponse<T>(response: StructuredResponse<T>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(response, null, 2)
      }
    ]
  };
}
