export const adminUserRoles = ["CUSTOMER", "STAFF", "ADMIN"] as const;
export type AdminUserRole = (typeof adminUserRoles)[number];

export const adminUserStatuses = ["ACTIVE", "INACTIVE", "BANNED"] as const;
export type AdminUserStatus = (typeof adminUserStatuses)[number];

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  avatarUrl?: string;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
  lastLoginAt?: string;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;
};

export type AdminUserFilters = {
  query: string;
  role: "ALL" | AdminUserRole;
  status: "ALL" | AdminUserStatus;
};

export function filterAdminUsers(
  items: readonly AdminUser[],
  filters: AdminUserFilters,
): AdminUser[] {
  const query = filters.query.trim().toLowerCase();

  return items.filter((user) => {
    const matchesQuery =
      !query ||
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.phone.toLowerCase().includes(query);

    const matchesRole = filters.role === "ALL" || user.role === filters.role;
    const matchesStatus = filters.status === "ALL" || user.status === filters.status;

    return matchesQuery && matchesRole && matchesStatus;
  });
}
