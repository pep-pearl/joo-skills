import { OrderDetailRoute } from "../routes/order-detail/OrderDetailRoute";
import { ProfileRoute } from "../routes/profile/ProfileRoute";
import { CheckoutRoute } from "../routes/checkout/CheckoutRoute";
import { SearchRoute } from "../routes/search/SearchRoute";
import { NotificationPreferencesRoute } from "../routes/notification-preferences/NotificationPreferencesRoute";

export const storefrontRoutes = [
  { path: "/orders/:orderId", element: OrderDetailRoute },
  { path: "/account/profile", element: ProfileRoute },
  { path: "/checkout", element: CheckoutRoute },
  { path: "/search", element: SearchRoute },
  { path: "/account/notifications", element: NotificationPreferencesRoute }
];
