export const locationFields = ["trainType", "amc", "ao", "altona", "localStorage", "vbn", "crl", "other"] as const;
export type LocationField = (typeof locationFields)[number];
export type Location = Record<LocationField, string>;
export const locationLabels: Record<LocationField, string> = {
  trainType: "Train type", amc: "AMC", ao: "AO", altona: "Altona",
  localStorage: "Local storage", vbn: "VBN", crl: "CRL", other: "Other",
};
export const emptyLocation = (): Location => ({ trainType: "", amc: "", ao: "", altona: "", localStorage: "", vbn: "", crl: "", other: "" });

export interface DTR {
  dtrNo: string;
  name: string;
  plmLink: string;
  orchestraLink: string;
}

/** A physical part keeps its ID and serial number throughout its lifecycle. */
export interface PartSnapshot {
  serialNumber: string;
  name: string;
  dtrNo: string;
  location: Location;
  revision: string;
  datecode: number;
  dateInstalled: string | null;
  operator: string;
  /** Assembly slot -> stable physical part ID. A child has at most one parent. */
  subParts: Record<string, string>;
}
export interface Part extends PartSnapshot {
  id: string;
  version: number;
}
export interface Change {
  changeId: string;
  transactionId: string;
  action: "created" | "updated" | "swapped";
  partId: string;
  previousPart: PartSnapshot | null;
  currentPart: PartSnapshot;
  counterpartId?: string;
  date: string;
  operator: string;
  note: string;
}
export interface PartDetail {
  part: Part;
  dtr: DTR;
  changes: Change[];
  subParts: Part[];
  parents: Part[];
}
export interface PartsResponse { parts: Part[]; total: number }
export interface Summary {
  totalParts: number;
  installedParts: number;
  storedParts: number;
  trainTypes: number;
  dtrCount: number;
  changes: number;
}
export interface CreatePartInput {
  serialNumber: string;
  dtrNo: string;
  location: Location;
  revision: string;
  datecode: number;
  dateInstalled: string | null;
  operator: string;
  note: string;
}
export interface UpdatePartInput {
  expectedVersion: number;
  location: Location;
  revision: string;
  datecode: number;
  dateInstalled: string | null;
  operator: string;
  note: string;
}
export interface SwapInput {
  partId: string;
  counterpartId: string;
  expectedVersion: number;
  counterpartVersion: number;
  operator: string;
  note: string;
}
export interface MutationResponse {
  parts: Part[];
  changes: Change[];
  transactionId: string;
}
export interface ApiError { error: string }
export function locationText(location: Location): string {
  return locationFields.filter((field) => field !== "trainType" && location[field]).map((field) => `${locationLabels[field]} · ${location[field]}`).join(" / ") || "Unassigned";
}
export function isInstalled(part: PartSnapshot): boolean { return part.dateInstalled !== null; }
