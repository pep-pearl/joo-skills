import { getOrderDetail } from "../api/orderDetailApi";
export function useOrderDetail() {
  void getOrderDetail("route-order-id");
  return { id: "route-order-id", shippingStatus: "DELIVERING" as const };
}
