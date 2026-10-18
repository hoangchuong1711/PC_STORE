export type AuthUser = {
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: "CUSTOMER" | "ADMIN";
};

export function authDestination(user: AuthUser): string {
  if (user && user.role === "ADMIN") {
    return "/admin";
  }
  return "/";
}

export class AuthApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function sendRequest(url: string, method = "GET", body?: unknown, transport = fetch) {
  let response: Response;
  try {
    let headers: Record<string, string> | undefined = undefined;
    let bodyString: string | undefined = undefined;
    if (body !== undefined) {
      headers = { "Content-Type": "application/json" };
      bodyString = JSON.stringify(body);
    }
    response = await transport(url, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers,
      body: bodyString,
    });
  } catch {
    throw new AuthApiError(0, "Không thể kết nối máy chủ. Vui lòng thử lại.");
  }

  if (response.status === 204) {
    return null;
  }

  let data: Record<string, unknown> | null = null;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    data = null;
  }

  if (!response.ok) {
    let msg = "Máy chủ trả lỗi " + response.status + ". Vui lòng thử lại.";
    if (data && typeof data.message === "string") {
      msg = data.message;
    }
    let code: string | undefined = undefined;
    if (data && typeof data.code === "string") {
      code = data.code;
    }
    throw new AuthApiError(response.status, msg, code);
  }

  if (!data) {
    throw new AuthApiError(502, "Phản hồi không hợp lệ.");
  }

  return data;
}

export function createAuthApi(transport = fetch) {
  return {
    async login(email: string, password: string): Promise<AuthUser> {
      const data = await sendRequest("/api/auth/login", "POST", { email, password }, transport);
      if (!data || !data.userId || !data.fullName || !data.email) {
        throw new AuthApiError(502, "Phản hồi tài khoản không hợp lệ.");
      }
      return data as AuthUser;
    },

    async register(input: { fullName: string; email: string; password: string }): Promise<AuthUser> {
      const payload = {
        fullName: input.fullName,
        email: input.email,
        password: input.password,
      };
      const data = await sendRequest("/api/auth/register", "POST", payload, transport);
      return data as AuthUser;
    },

    async me(): Promise<AuthUser | null> {
      try {
        const data = await sendRequest("/api/auth/me", "GET", undefined, transport);
        return data as AuthUser;
      } catch (err) {
        if (err instanceof AuthApiError && err.status === 401) {
          return null;
        }
        throw err;
      }
    },

    async logout(): Promise<void> {
      try {
        await sendRequest("/api/auth/logout", "POST", {}, transport);
      } catch (err) {
        if (err instanceof AuthApiError && err.status === 401) {
          return;
        }
        throw err;
      }
    },

    async forgotPassword(email: string): Promise<{ message: string }> {
      return (await sendRequest("/api/auth/forgot-password", "POST", { email }, transport)) as { message: string };
    },

    async verifyResetOtp(email: string, otp: string): Promise<{ resetToken: string }> {
      const data = await sendRequest("/api/auth/verify-reset-otp", "POST", { email, otp }, transport);
      if (!data || !data.resetToken) {
        throw new AuthApiError(502, "Phản hồi đặt lại mật khẩu không hợp lệ.");
      }
      return data as { resetToken: string };
    },

    async resetPassword(email: string, resetToken: string, newPassword: string): Promise<{ message: string }> {
      return (await sendRequest("/api/auth/reset-password", "POST", { email, resetToken, newPassword }, transport)) as { message: string };
    },

    async updateProfile(input: { fullName: string; phone?: string | null }): Promise<AuthUser> {
      return (await sendRequest("/api/customer/profile", "PATCH", input, transport)) as AuthUser;
    },

    async changePassword(input: { oldPassword: string; newPassword: string }): Promise<{ message: string }> {
      return (await sendRequest("/api/customer/change-password", "POST", input, transport)) as { message: string };
    },
  };
}

export const authApi = createAuthApi();
