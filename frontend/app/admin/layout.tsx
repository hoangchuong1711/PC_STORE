import type { Metadata } from "next";
import { AdminShell } from "../../components/admin/admin-shell";
import "../../components/admin/admin.css";

export const metadata: Metadata = {
  title: "Admin | PC Store",
  description: "Không gian vận hành cửa hàng PC Store.",
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
