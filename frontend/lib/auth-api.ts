export type AuthUser = { userId: number; fullName: string; email: string; phone: string | null; role: "CUSTOMER" | "ADMIN" };
export function authDestination(user: AuthUser): string { return user.role === "ADMIN" ? "/admin" : "/"; }
export class AuthApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export function createAuthApi(transport: typeof fetch = fetch) {
  async function request(path: string, body?: unknown) {
    let response: Response;
    try {
      response = await transport(`/api/auth/${path}`, {
        method: body === undefined ? "GET" : "POST",
        credentials: "same-origin", cache: "no-store",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { throw new AuthApiError(0, "Không thể kết nối máy chủ. Vui lòng thử lại."); }
    if (response.status === 204 && path === "logout") return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new AuthApiError(response.status, data?.message ?? `Máy chủ trả lỗi ${response.status}. Vui lòng thử lại.`);
    if (!data || !Number.isInteger(data.userId) || typeof data.fullName !== "string" || typeof data.email !== "string"
      || !["ADMIN", "CUSTOMER"].includes(data.role)) throw new AuthApiError(502, "Phản hồi tài khoản không hợp lệ.");
    return data as AuthUser;
  }
  return {
    async login(email: string, password: string): Promise<AuthUser> { return (await request("login", { email, password }))!; },
    async register(input: { fullName: string; email: string; password: string }): Promise<AuthUser> {
      const { fullName, email, password } = input;
      return (await request("register", { fullName, email, password }))!;
    },
    async me(): Promise<AuthUser | null> {
      try { return await request("me"); }
      catch (error) { if (error instanceof AuthApiError && error.status === 401) return null; throw error; }
    },
    async logout(): Promise<void> {
      try { await request("logout", {}); }
      catch (error) { if (!(error instanceof AuthApiError && error.status === 401)) throw error; }
    },
  };
}
