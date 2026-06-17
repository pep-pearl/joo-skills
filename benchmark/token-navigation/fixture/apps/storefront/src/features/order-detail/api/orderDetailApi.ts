export async function getOrderDetail(orderId: string) {
  return { id: orderId, shippingStatus: "DELIVERING" as const };
}
