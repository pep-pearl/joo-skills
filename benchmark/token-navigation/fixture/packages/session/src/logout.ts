import { sessionStore } from "./sessionStore";
import { resetCartForLogout } from "../../../apps/storefront/src/features/cart/model/cartStore";
export function logout() {
  sessionStore.clear();
  resetCartForLogout();
}
