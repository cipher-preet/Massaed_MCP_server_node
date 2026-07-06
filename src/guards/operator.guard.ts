import type { Document } from "mongodb";

const BLOCKED_OPERATORS = new Set([
  "$out",
  "$merge",
  "$function",
  "$where",
  "$accumulator",
  "insert",
  "insertOne",
  "insertMany",
  "update",
  "updateOne",
  "updateMany",
  "delete",
  "deleteOne",
  "deleteMany",
  "drop",
  "dropDatabase",
  "createCollection",
  "renameCollection",
  "findAndModify",
  "bulkWrite"
]);

export function assertNoBlockedOperators(value: unknown, path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoBlockedOperators(item, `${path}[${index}]`));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Document)) {
    if (BLOCKED_OPERATORS.has(key)) {
      throw new Error(`Operator or command ${key} is not allowed at ${path}`);
    }

    assertNoBlockedOperators(nestedValue, `${path}.${key}`);
  }
}

export function aggregationHasLimit(pipeline: Document[]): boolean {
  return pipeline.some((stage) => Object.prototype.hasOwnProperty.call(stage, "$limit"));
}
