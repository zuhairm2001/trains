import type { CreatePartInput, Location, SwapInput, UpdatePartInput } from "../lib/contracts";
import { locationFields } from "../lib/contracts";

export class ApiError extends Error {
  constructor(public readonly status: 400 | 404 | 409 | 422, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

type ObjectValue = Record<string, unknown>;

function object(value: unknown, label: string, keys: readonly string[]): ObjectValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApiError(422, `${label} must be a JSON object.`);
  }
  const record = value as ObjectValue;
  const unexpected = Object.keys(record).find((key) => !keys.includes(key));
  if (unexpected) throw new ApiError(422, `Unknown ${label.toLowerCase()} field: ${unexpected}.`);
  const missing = keys.find((key) => !Object.hasOwn(record, key));
  if (missing) throw new ApiError(422, `${missing} is required.`);
  return record;
}

function text(value: unknown, label: string, max: number, allowEmpty = false): string {
  if (typeof value !== "string") throw new ApiError(422, `${label} must be a string.`);
  const result = value.trim();
  if (!allowEmpty && !result) throw new ApiError(422, `${label} cannot be blank.`);
  if (result.length > max) throw new ApiError(422, `${label} must be at most ${max} characters.`);
  return result;
}

function integer(value: unknown, label: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new ApiError(422, `${label} must be a whole number of at least ${minimum}.`);
  }
  return value;
}

function installedDate(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(422, "dateInstalled must be a valid YYYY-MM-DD date or null.");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ApiError(422, "dateInstalled must be a valid calendar date.");
  }
  return value;
}

function location(value: unknown): Location {
  const record = object(value, "Location", locationFields);
  return Object.fromEntries(locationFields.map((field) => [field, text(record[field], field, 160, true)])) as Location;
}

function editable(record: ObjectValue) {
  const result = {
    location: location(record.location),
    revision: text(record.revision, "Revision", 64),
    datecode: integer(record.datecode, "Datecode", 0),
    dateInstalled: installedDate(record.dateInstalled),
    operator: text(record.operator, "Operator", 100),
    note: text(record.note, "Note", 2000, true),
  };
  if (result.dateInstalled !== null && !result.location.trainType) {
    throw new ApiError(422, "An installed part must have a train type.");
  }
  return result;
}

const editableKeys = ["location", "revision", "datecode", "dateInstalled", "operator", "note"] as const;

export function parseCreatePart(value: unknown): CreatePartInput {
  const record = object(value, "Part", ["serialNumber", "dtrNo", ...editableKeys]);
  return {
    serialNumber: text(record.serialNumber, "Serial number", 100),
    dtrNo: text(record.dtrNo, "DTR number", 100),
    ...editable(record),
  };
}

export function parseUpdatePart(value: unknown): UpdatePartInput {
  const record = object(value, "Part update", ["expectedVersion", ...editableKeys]);
  return { expectedVersion: integer(record.expectedVersion, "Expected version", 1), ...editable(record) };
}

export function parseSwap(value: unknown): SwapInput {
  const record = object(value, "Swap", ["partId", "counterpartId", "expectedVersion", "counterpartVersion", "operator", "note"]);
  return {
    partId: text(record.partId, "Part ID", 120),
    counterpartId: text(record.counterpartId, "Counterpart ID", 120),
    expectedVersion: integer(record.expectedVersion, "Expected version", 1),
    counterpartVersion: integer(record.counterpartVersion, "Counterpart version", 1),
    operator: text(record.operator, "Operator", 100),
    note: text(record.note, "Note", 2000, true),
  };
}

const filterKeys = ["q", "serialNumber", "dtrNo", "datecode", ...locationFields] as const;
export type PartFilters = Partial<Record<(typeof filterKeys)[number], string>>;

export function parseFilters(query: unknown): PartFilters {
  if (typeof query !== "object" || query === null || Array.isArray(query)) {
    throw new ApiError(400, "Filters must be query parameters.");
  }
  const result: PartFilters = {};
  for (const [key, value] of Object.entries(query)) {
    if (!(filterKeys as readonly string[]).includes(key)) throw new ApiError(400, `Unknown filter: ${key}.`);
    if (typeof value !== "string") throw new ApiError(400, `${key} must be a single string value.`);
    if (value.length > 500) throw new ApiError(400, `${key} must be at most 500 characters.`);
    const trimmed = value.trim();
    if (key === "datecode" && trimmed && (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(Number(trimmed)))) {
      throw new ApiError(400, "Datecode filter must be a non-negative whole number.");
    }
    if (trimmed) result[key as keyof PartFilters] = trimmed;
  }
  return result;
}
