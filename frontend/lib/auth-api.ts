export type AuthUser = { userId: number; fullName: string; email: string; phone: string | null; role: "CUSTOMER" | "ADMIN" };
export function authDestination(user: AuthUser): string { return user.role === "ADMIN" ? "/admin" : "/"; }
export class AuthApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function createAuthApi(transport: typeof fetch = fetch) {
  async function recovery(path: string, body: unknown): Promise<{ message?: string; resetToken?: string }> {
    let response: Response;
    try {
      response = await transport(`/api/auth/${path}`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } catch { throw new AuthApiError(0, "Không thể kết nối máy chủ. Vui lòng thử lại."); }
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new AuthApiError(response.status, data?.message ?? `Máy chủ trả lỗi ${response.status}. Vui lòng thử lại.`, data?.code);
    if (!data || (path === "verify-reset-otp" ? typeof data.resetToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(data.resetToken) : typeof data.message !== "string"))
      throw new AuthApiError(502, "Phản hồi đặt lại mật khẩu không hợp lệ.");
    return data;
  }
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
    if (!response.ok) throw new AuthApiError(response.status, data?.message ?? `Máy chủ trả lỗi ${response.status}. Vui lòng thử lại.`, data?.code);
    if (!data || !Number.isInteger(data.userId) || typeof data.fullName !== "string" || typeof data.email !== "string"
      || !["ADMIN", "CUSTOMER"].includes(data.role)) throw new AuthApiError(502, "Phản hồi tài khoản không hợp lệ.");
    return data as AuthUser;
  }
  return {
    async forgotPassword(email: string): Promise<{ message: string }> {
      return await recovery("forgot-password", { email }) as { message: string };
    },
    async verifyResetOtp(email: string, otp: string): Promise<{ resetToken: string }> {
      return await recovery("verify-reset-otp", { email, otp }) as { resetToken: string };
    },
    async resetPassword(email: string, resetToken: string, newPassword: string): Promise<{ message: string }> {
      return await recovery("reset-password", { email, resetToken, newPassword }) as { message: string };
    },
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
    async updateProfile(input: { fullName: string; phone?: string | null }): Promise<AuthUser> {
      let response: Response;
      try {
        response = await transport("/api/customer/profile", {
          method: "PATCH",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
      } catch {
        throw new AuthApiError(0, "Không thể kết nối máy chủ. Vui lòng thử lại.");
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new AuthApiError(response.status, data?.message ?? `Máy chủ trả lỗi ${response.status}. Vui lòng thử lại.`);
      }
      return data as AuthUser;
    },
    async changePassword(input: { oldPassword: string; newPassword: string }): Promise<{ message: string }> {
      let response: Response;
      try {
        response = await transport("/api/customer/change-password", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
      } catch {
        throw new AuthApiError(0, "Không thể kết nối máy chủ. Vui lòng thử lại.");
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new AuthApiError(response.status, data?.message ?? `Máy chủ trả lỗi ${response.status}. Vui lòng thử lại.`);
      }
      return data as { message: string };
    },
  };
}

export const authApi = createAuthApi();
