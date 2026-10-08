import { OrderDetail } from "../../../components/orders";

export const dynamic = "force-dynamic";

export default async function OrderDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
