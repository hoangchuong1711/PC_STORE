import { Metadata } from "next";
import { AccountDashboard } from "../../components/account";

export const metadata: Metadata = {
  title: "Tài khoản của tôi | PC Store",
  description: "Quản lý hồ sơ cá nhân, sổ địa chỉ nhận hàng và dàn máy PC đã lưu tại PC Store.",
};

export default function AccountPage() {
  return <AccountDashboard />;
}
