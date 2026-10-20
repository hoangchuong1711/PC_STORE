import type { Metadata } from "next";
import { AdminReviews } from "@/components/admin/admin-reviews";

export const metadata: Metadata = {
  title: "Kiểm duyệt Đánh giá | Quản trị PC Store",
  description: "Quản lý và kiểm duyệt nhận xét đánh giá từ khách hàng",
};

export default function AdminReviewsPage() {
  return <AdminReviews />;
}
