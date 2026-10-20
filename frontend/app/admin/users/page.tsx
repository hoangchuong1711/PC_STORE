import type { Metadata } from "next";
import { AdminUsers } from "@/components/admin/admin-users";

export const metadata: Metadata = {
  title: "Người dùng & Khách hàng | Quản trị PC Store",
  description: "Quản lý tài khoản khách hàng, nhân viên và phân quyền hệ thống",
};

export default function AdminUsersPage() {
  return <AdminUsers />;
}
