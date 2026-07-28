import { apiDataJsonAuthed } from "./api-data-client";

export type MdService = {
  id: number;
  name: string;
  type: "api" | "web" | "mobile" | "other";
  owner: string | null;
  environment: string | null;
  baseUrl: string | null;
  version: string | null;
  verificationStatus: "unverified" | "verified";
  origin: "manual" | "from_brd" | "from_run";
  createdAt: string;
  updatedAt: string;
};

export type MdFeature = {
  id: number;
  serviceId: number;
  name: string;
  flow: string | null;
  businessRules: string | null;
  version: string | null;
  verificationStatus: "unverified" | "verified";
  origin: "manual" | "from_brd" | "from_run";
  createdAt: string;
  updatedAt: string;
};

export type MdEndpoint = {
  id: number;
  featureId: number;
  kind: "endpoint" | "screen";
  method: string | null;
  pathOrSelector: string;
  spec: unknown;
  version: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MdTestData = {
  id: number;
  serviceId: number;
  featureId: number | null;
  name: string;
  data: unknown;
  origin: "manual" | "from_brd" | "from_run";
  verificationStatus: "unverified" | "verified";
  createdAt: string;
  updatedAt: string;
};

export type MdTestcaseLibrary = {
  id: number;
  featureId: number;
  title: string;
  spec: unknown;
  type: "functional" | "integration" | "regression" | "negative" | "e2e";
  origin: "manual" | "from_brd" | "from_run";
  version: string | null;
  verificationStatus: "unverified" | "verified";
  createdAt: string;
  updatedAt: string;
};

export type MdSuggestion = {
  id: number;
  source: "from_run" | "from_generation";
  sourceRefId: number | null;
  targetType: "service" | "feature" | "endpoint" | "test_data" | "library";
  payload: unknown;
  status: "pending" | "approved" | "rejected";
  decidedBy: number | null;
  decidedAt: string | null;
  createdAt: string;
};

const BASE = "/master-data";

// --- services ---
export const listMdServices = () => apiDataJsonAuthed<MdService[]>(`${BASE}/services`);
export const createMdService = (body: {
  name: string;
  type?: MdService["type"];
  owner?: string | null;
  environment?: string | null;
  baseUrl?: string | null;
  version?: string | null;
}) => apiDataJsonAuthed<MdService>(`${BASE}/services`, { method: "POST", body });
export const updateMdService = (
  id: number,
  body: Partial<Omit<MdService, "id" | "createdAt" | "updatedAt" | "origin">>
) => apiDataJsonAuthed<MdService>(`${BASE}/services/${id}`, { method: "PATCH", body });
export const deleteMdService = (id: number) =>
  apiDataJsonAuthed<{ id: number; deleted: true }>(`${BASE}/services/${id}`, {
    method: "DELETE",
  });

// --- features ---
export const listMdFeatures = (serviceId: number) =>
  apiDataJsonAuthed<MdFeature[]>(`${BASE}/services/${serviceId}/features`);
export const createMdFeature = (
  serviceId: number,
  body: { name: string; flow?: string | null; businessRules?: string | null; version?: string | null }
) => apiDataJsonAuthed<MdFeature>(`${BASE}/services/${serviceId}/features`, { method: "POST", body });
export const updateMdFeature = (
  id: number,
  body: Partial<Omit<MdFeature, "id" | "serviceId" | "createdAt" | "updatedAt" | "origin">>
) => apiDataJsonAuthed<MdFeature>(`${BASE}/features/${id}`, { method: "PATCH", body });
export const deleteMdFeature = (id: number) =>
  apiDataJsonAuthed<{ id: number; deleted: true }>(`${BASE}/features/${id}`, { method: "DELETE" });

// --- endpoints ---
export const listMdEndpoints = (featureId: number) =>
  apiDataJsonAuthed<MdEndpoint[]>(`${BASE}/features/${featureId}/endpoints`);
export const createMdEndpoint = (
  featureId: number,
  body: {
    kind?: MdEndpoint["kind"];
    method?: string | null;
    pathOrSelector: string;
    spec?: unknown;
    version?: string | null;
  }
) => apiDataJsonAuthed<MdEndpoint>(`${BASE}/features/${featureId}/endpoints`, { method: "POST", body });
export const deleteMdEndpoint = (id: number) =>
  apiDataJsonAuthed<{ id: number; deleted: true }>(`${BASE}/endpoints/${id}`, { method: "DELETE" });

// --- test data ---
export const listMdTestData = (serviceId: number) =>
  apiDataJsonAuthed<MdTestData[]>(`${BASE}/services/${serviceId}/test-data`);
export const createMdTestData = (body: {
  serviceId: number;
  featureId?: number | null;
  name: string;
  data?: unknown;
}) => apiDataJsonAuthed<MdTestData>(`${BASE}/test-data`, { method: "POST", body });
export const deleteMdTestData = (id: number) =>
  apiDataJsonAuthed<{ id: number; deleted: true }>(`${BASE}/test-data/${id}`, { method: "DELETE" });

// --- testcase library ---
export const listMdTestcaseLibrary = (featureId: number) =>
  apiDataJsonAuthed<MdTestcaseLibrary[]>(`${BASE}/features/${featureId}/testcase-library`);
export const createMdTestcaseLibrary = (
  featureId: number,
  body: { title: string; spec?: unknown; type?: MdTestcaseLibrary["type"]; version?: string | null }
) =>
  apiDataJsonAuthed<MdTestcaseLibrary>(`${BASE}/features/${featureId}/testcase-library`, {
    method: "POST",
    body,
  });
export const deleteMdTestcaseLibrary = (id: number) =>
  apiDataJsonAuthed<{ id: number; deleted: true }>(`${BASE}/testcase-library/${id}`, {
    method: "DELETE",
  });

// --- suggestions ---
export const listMdSuggestions = (status?: MdSuggestion["status"]) =>
  apiDataJsonAuthed<MdSuggestion[]>(`${BASE}/suggestions${status ? `?status=${status}` : ""}`);
export const approveMdSuggestion = (id: number) =>
  apiDataJsonAuthed<MdSuggestion>(`${BASE}/suggestions/${id}/approve`, { method: "POST", body: {} });
export const rejectMdSuggestion = (id: number) =>
  apiDataJsonAuthed<MdSuggestion>(`${BASE}/suggestions/${id}/reject`, { method: "POST", body: {} });
