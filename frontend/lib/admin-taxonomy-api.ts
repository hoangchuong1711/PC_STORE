export type TaxonomyKind = "categories" | "brands";
export type TaxonomyStatus = "ACTIVE" | "INACTIVE";
export const componentTypes = ["CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "PSU", "CASE", "COOLER"] as const;
export type ComponentType = typeof componentTypes[number];
export type TaxonomyInput = {
  name: string; description: string | null; status: TaxonomyStatus;
  componentType: ComponentType | null; logoUrl: string | null;
};
export type TaxonomyEntry = TaxonomyInput & { id: number; productCount: number };
export class TaxonomyApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
function parseEntry(value: unknown): TaxonomyEntry {
  const row = value as Partial<TaxonomyEntry> | null;
  if (!row || typeof row !== "object" || !Number.isSafeInteger(row.id) || (row.id ?? 0) < 1
    || typeof row.name !== "string" || (row.description !== null && typeof row.description !== "string")
    || !["ACTIVE", "INACTIVE"].includes(row.status ?? "")
    || !Number.isSafeInteger(row.productCount) || (row.productCount ?? -1) < 0
    || (row.componentType !== null && !componentTypes.includes(row.componentType as ComponentType))
    || (row.logoUrl !== null && typeof row.logoUrl !== "string")) {
    throw new TaxonomyApiError(502, "INVALID_RESPONSE", "Dữ liệu danh mục/hãng không hợp lệ.");
  }
  return row as TaxonomyEntry;
}
export function createAdminTaxonomyApi(transport: typeof fetch = fetch) {
  async function request(path: string, method: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await transport(`/api/admin/${path}`, {
        method, credentials: "same-origin", cache: "no-store",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { throw new TaxonomyApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ. Vui lòng thử lại."); }
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new TaxonomyApiError(response.status,
      typeof data?.code === "string" ? data.code : "HTTP_ERROR",
      typeof data?.message === "string" ? data.message : `Máy chủ trả lỗi ${response.status}.`);
    return data;
  }
  function idPath(kind: TaxonomyKind, id: number) {
    if (!Number.isSafeInteger(id) || id < 1) throw new TaxonomyApiError(400, "INVALID_ID", "ID không hợp lệ.");
    return `${kind}/${id}`;
  }
  return {
    async list(kind: TaxonomyKind): Promise<TaxonomyEntry[]> {
      const data = await request(kind, "GET");
      if (!Array.isArray(data)) throw new TaxonomyApiError(502, "INVALID_RESPONSE", "Danh sách không hợp lệ.");
      return data.map(parseEntry);
    },
    async save(kind: TaxonomyKind, id: number | null, input: TaxonomyInput): Promise<TaxonomyEntry> {
      const { name, description, status, componentType, logoUrl } = input;
      const body = kind === "categories" ? { name, description, status, componentType } : { name, description, status, logoUrl };
      return parseEntry(await request(id === null ? kind : idPath(kind, id), id === null ? "POST" : "PUT", body));
    },
    async setStatus(kind: TaxonomyKind, id: number, status: TaxonomyStatus): Promise<TaxonomyEntry> {
      return parseEntry(await request(`${idPath(kind, id)}/status`, "PUT", { status }));
    },
  };
}

export const adminTaxonomyApi = createAdminTaxonomyApi();
