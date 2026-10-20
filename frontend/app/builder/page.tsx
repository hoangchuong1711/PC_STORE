import type { Metadata } from "next";
import { PCBuilderPage } from "../../components/builder";

export const metadata: Metadata = {
  title: "Tự ráp cấu hình PC · PC Builder Thông minh | PC Store",
  description:
    "Công cụ PC Builder tự động kiểm tra tương thích socket CPU, bo mạch chủ, RAM và công suất nguồn trong thời gian thực.",
};

export default function BuilderPage() {
  return <PCBuilderPage />;
}
