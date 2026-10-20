import type { Metadata } from "next";
import { AdminCategories } from "@/components/admin/admin-categories";

export const metadata: Metadata = {
  title: "Danh mục & Thương hiệu | Quản trị PC Store",
  description: "Quản lý phân loại danh mục sản phẩm và thương hiệu linh kiện máy tính",
};

export default function AdminCategoriesPage() {
  return <AdminCategories />;
}
