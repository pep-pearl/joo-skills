type ShippingStatus = "READY" | "DELIVERING" | "DELIVERED";
const labels: Record<ShippingStatus, string> = {
  READY: "배송 준비",
  DELIVERING: "배송 중",
  DELIVERED: "배송 완료"
};
export function ShippingStatusBadge({ status }: { status: ShippingStatus }) {
  return <span data-status={status}>{labels[status]}</span>;
}
