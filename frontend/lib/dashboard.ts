import type { AdminProductItem } from "./admin-product-api";
import type { OrderResponse } from "./order-api";

type Product = Pick<AdminProductItem, "productId" | "status" | "availableQuantity">;
type Order = Pick<OrderResponse, "orderId" | "orderDate" | "status" | "totalAmount" | "payment">;

export type DashboardPoint = {
  label: string;
  fullDate: string;
  revenue: number;
  orders: number;
};

function vietnamDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = (part: string) => parts.find((item) => item.type === part)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function buildDashboardData<P extends Product, O extends Order>(
  products: P[], orders: O[], now: Date = new Date(),
) {
  const activeProducts = products.filter((item) => item.status === "ACTIVE" || item.status === "OUT_OF_STOCK");
  const lowStockProducts = activeProducts
    .filter((item) => item.availableQuantity <= 5)
    .sort((a, b) => a.availableQuantity - b.availableQuantity)
    .slice(0, 5);
  const pendingOrders = orders.filter((item) => item.status === "PENDING").length;
  const paidRevenue = orders
    .filter((item) => item.payment?.status === "PAID" && item.status !== "CANCELLED")
    .reduce((sum, item) => sum + item.totalAmount, 0);
  const recentOrders = [...orders].sort((a, b) =>
    b.orderDate.localeCompare(a.orderDate) || b.orderId - a.orderId,
  );
  const trend: DashboardPoint[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getTime() - (6 - index) * 86_400_000);
    const key = vietnamDateKey(date);
    const dayOrders = orders.filter((item) => item.orderDate.slice(0, 10) === key);
    return {
      label: `${key.slice(8, 10)}/${key.slice(5, 7)}`,
      fullDate: new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", timeZone: "Asia/Ho_Chi_Minh" }).format(date),
      revenue: dayOrders.filter((item) => item.payment?.status === "PAID" && item.status !== "CANCELLED")
        .reduce((sum, item) => sum + item.totalAmount, 0),
      orders: dayOrders.length,
    };
  });
  return { activeProducts, lowStockProducts, pendingOrders, paidRevenue, recentOrders, trend };
}
