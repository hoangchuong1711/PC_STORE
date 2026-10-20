import type { AdminUser, AdminUserFilters } from "./admin-users";

export type AdminUserBackendDto = {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  orderCount: number;
  totalSpent: number;
};

export class AdminUsersApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function mapBackendUserToAdminUser(dto: AdminUserBackendDto): AdminUser {
  const role =
    dto.role === "ADMIN" || dto.role === "STAFF" || dto.role === "CUSTOMER"
      ? dto.role
      : "CUSTOMER";
  const status =
    dto.status === "INACTIVE" || dto.status === "BANNED" ? "BANNED" : "ACTIVE";

  return {
    id: String(dto.userId),
    name: dto.fullName,
    email: dto.email,
    phone: dto.phone || "",
    role,
    status,
    orderCount: Number(dto.orderCount || 0),
    totalSpent: Number(dto.totalSpent || 0),
    createdAt: "2026-01-01T00:00:00+07:00",
  };
}

export const adminUsersApi = {
  async list(filters?: Partial<AdminUserFilters>): Promise<AdminUser[]> {
    const params = new URLSearchParams();
    if (filters?.role && filters.role !== "ALL") params.set("role", filters.role);
    if (filters?.status && filters.status !== "ALL") {
      const beStatus = filters.status === "BANNED" ? "INACTIVE" : filters.status;
      params.set("status", beStatus);
    }
    if (filters?.query && filters.query.trim()) params.set("query", filters.query.trim());

    const qs = params.toString();
    const url = `/api/admin/users${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new AdminUsersApiError(
        res.status,
        data?.message || `Lỗi tải danh sách người dùng (${res.status})`
      );
    }

    const data = (await res.json()) as AdminUserBackendDto[];
    return Array.isArray(data) ? data.map(mapBackendUserToAdminUser) : [];
  },

  async updateStatus(
    userId: string | number,
    status: "ACTIVE" | "INACTIVE" | "BANNED",
    reason?: string
  ): Promise<AdminUser> {
    const numericId = typeof userId === "string" ? parseInt(userId, 10) : userId;
    const targetStatus = status === "BANNED" ? "INACTIVE" : status;

    const res = await fetch(`/api/admin/users/${numericId}/status`, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetStatus, reason }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new AdminUsersApiError(
        res.status,
        data?.message || `Lỗi cập nhật trạng thái (${res.status})`
      );
    }

    const data = (await res.json()) as AdminUserBackendDto;
    const mapped = mapBackendUserToAdminUser(data);
    if (status === "BANNED" && reason) {
      mapped.banReason = reason;
      mapped.bannedAt = new Date().toISOString();
      mapped.bannedBy = "Quản trị viên";
    }
    return mapped;
  },
};
