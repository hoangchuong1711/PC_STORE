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

export const initialAdminUsers: AdminUser[] = [
  {
    id: "usr-01",
    name: "Trần Minh Đức",
    email: "duc.tran@example.com",
    phone: "0909123456",
    role: "CUSTOMER",
    status: "ACTIVE",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
    orderCount: 4,
    totalSpent: 86450000,
    createdAt: "2025-11-12T09:00:00+07:00",
    lastLoginAt: "2026-10-05T20:30:00+07:00",
  },
  {
    id: "usr-02",
    name: "Lê Hoàng Phúc",
    email: "phuc.le@studio.vn",
    phone: "0918765432",
    role: "CUSTOMER",
    status: "ACTIVE",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80",
    orderCount: 2,
    totalSpent: 42990000,
    createdAt: "2026-01-08T14:20:00+07:00",
    lastLoginAt: "2026-10-04T11:15:00+07:00",
  },
  {
    id: "usr-03",
    name: "Phạm Hải Đăng",
    email: "dang.pham@creator.io",
    phone: "0982345678",
    role: "CUSTOMER",
    status: "ACTIVE",
    avatarUrl: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=120&q=80",
    orderCount: 1,
    totalSpent: 21990000,
    createdAt: "2026-03-15T16:00:00+07:00",
    lastLoginAt: "2026-09-28T09:40:00+07:00",
  },
  {
    id: "usr-04",
    name: "Nguyễn Vũ Nam",
    email: "vunam.gamer@gmail.com",
    phone: "0933112233",
    role: "CUSTOMER",
    status: "BANNED",
    orderCount: 1,
    totalSpent: 3500000,
    createdAt: "2026-02-01T10:10:00+07:00",
    lastLoginAt: "2026-09-02T18:00:00+07:00",
    banReason: "Spam bình luận không phù hợp và cố ý tạo đơn hàng ảo COD nhiều lần.",
    bannedAt: "2026-09-05T10:30:00+07:00",
    bannedBy: "Minh Anh (Admin)",
  },
  {
    id: "usr-05",
    name: "Minh Anh",
    email: "admin@pcstore.vn",
    phone: "0903999888",
    role: "ADMIN",
    status: "ACTIVE",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    orderCount: 0,
    totalSpent: 0,
    createdAt: "2025-01-01T00:00:00+07:00",
    lastLoginAt: "2026-10-06T08:00:00+07:00",
  },
  {
    id: "usr-06",
    name: "Quốc Huy",
    email: "huy.tech@pcstore.vn",
    phone: "0903777666",
    role: "STAFF",
    status: "ACTIVE",
    orderCount: 0,
    totalSpent: 0,
    createdAt: "2025-06-15T08:00:00+07:00",
    lastLoginAt: "2026-10-06T07:45:00+07:00",
  },
];

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
