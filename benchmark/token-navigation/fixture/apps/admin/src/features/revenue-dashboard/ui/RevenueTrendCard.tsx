export function RevenueTrendCard({ amount, currency }: { amount: number; currency: string }) {
  const formatted = new Intl.NumberFormat("ko-KR", { style: "currency", currency }).format(amount);
  return <section><h2>매출 추이</h2><strong>{formatted}</strong></section>;
}
