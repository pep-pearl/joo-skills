import { ShippingStatusBadge } from "./ShippingStatusBadge";
import { useOrderDetail } from "../model/useOrderDetail";

export function OrderDetailPage() {
  const order = useOrderDetail();
  return <main><h1>주문 상세</h1><ShippingStatusBadge status={order.shippingStatus} /></main>;
}
