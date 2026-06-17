import { validateCoupon } from "../api/couponApi";
export function CouponField() {
  return <input onBlur={(e) => void validateCoupon(e.target.value)} aria-label="coupon" />;
}
