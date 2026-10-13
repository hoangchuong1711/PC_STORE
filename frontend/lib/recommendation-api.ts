import type { BuilderCatalogProduct, SavedBuild } from "./builder-api";
import type { CartResponse } from "./cart-api";

export type RecommendationAnswers = {
  pcBudget: number; purposes: string[]; purposeNotes: string | null; softwareText: string;
  gamesText: string | null; targetResolution: string | null; targetFps: number | null; minStorageGb: number;
};
export type Recommendation = {
  requestId: number; status: "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED";
  answers: RecommendationAnswers;
  criteria: { thresholds: {componentType: string; field: string; minimum: number; preferred: number}[]; assumptions: string[] } | null;
  failureCode: string | null; failureReason: string | null;
  result: { build: SavedBuild; products: BuilderCatalogProduct[]; estimatedTotal: number; level: "PREFERRED" | "MINIMUM";
    searchLimited: boolean; visitedNodes: number; reason: string } | null;
};
export class RecommendationApiError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) {super(message);this.status=status;this.code=code;}
}
export function createRecommendationApi(transport: typeof fetch = fetch) {
  async function request(path: string, method = "GET", body?: unknown): Promise<unknown> {
    let res: Response;
    try { res=await transport(`/api/customer/recommendations${path}`,{method,credentials:"same-origin",cache:"no-store",
      headers:body===undefined?undefined:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)}); }
    catch {throw new RecommendationApiError(0,"NETWORK_ERROR","Không thể kết nối máy chủ. Hãy thử lại.");}
    const data=await res.json().catch(()=>null);
    if(!res.ok) throw new RecommendationApiError(res.status,data?.code??"HTTP_ERROR",data?.message??"Không thể xử lý tư vấn.");
    return data;
  }
  function invalid(): never {throw new RecommendationApiError(502,"INVALID_RESPONSE","Phản hồi tư vấn không hợp lệ.");}
  return {
    async create(answers: RecommendationAnswers) {
      const data=await request("","POST",answers) as {requestId:number;status:string}|null;
      if(!data || !Number.isInteger(data.requestId) || data.requestId<1 || data.status!=="QUEUED") return invalid();
      return data;
    },
    async get(id: number): Promise<Recommendation> {
      const d=await request(`/${id}`) as Recommendation|null;
      if(!d || !Number.isInteger(d.requestId) || !["QUEUED","PROCESSING","SUCCEEDED","FAILED"].includes(d.status)
        || !d.answers || typeof d.answers.pcBudget!=="number"
        || (d.status==="SUCCEEDED" && (!d.result || !Array.isArray(d.result.products) || !d.result.build
          || !Array.isArray(d.result.build.items) || typeof d.result.estimatedTotal!=="number"))) return invalid();
      return d;
    },
    async cart(id: number): Promise<CartResponse> {
      const d=await request(`/${id}/cart`,"POST") as CartResponse|null;
      if(!d || !Array.isArray(d.items) || typeof d.totalAmount!=="number") return invalid(); return d;
    },
    async copy(id: number): Promise<SavedBuild> {
      const d=await request(`/${id}/copy`,"POST") as SavedBuild|null;
      if(!d || !Number.isInteger(d.buildId) || d.sourceType!=="MANUAL") return invalid(); return d;
    },
  };
}
export const recommendationApi=createRecommendationApi();
