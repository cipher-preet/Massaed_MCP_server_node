import type { Document, Sort } from "mongodb";

export interface FindQueryInput {
  collectionName: string;
  filter: Document;
  projection?: Document;
  sort?: Sort;
  limit?: number;
}

export interface AggregationQueryInput {
  collectionName: string;
  pipeline: Document[];
  limit?: number;
}

export interface StructuredError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface StructuredSuccess<T> {
  ok: true;
  data: T;
}

export type StructuredResponse<T> = StructuredSuccess<T> | StructuredError;
