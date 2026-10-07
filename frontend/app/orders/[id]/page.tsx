import { OrderDetail } from "../../../components/orders";
import { getOrder, orders } from "../../../lib/orders";

export function generateStaticParams() {
  return orders.map((order) => ({ id: order.id }));
}

export default async function OrderDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = getOrder(id);

  return <OrderDetail order={order} id={id} />;
}
