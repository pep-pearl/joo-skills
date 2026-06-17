export async function validateCoupon(code: string) {
  if (!code.trim()) return { valid: false, reason: "EMPTY" };
  return { valid: code === "WELCOME", discountRate: 0.1 };
}
