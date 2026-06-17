import { OrderQueueRoute } from "../routes/order-queue/OrderQueueRoute";
import { RevenueDashboardRoute } from "../routes/revenue-dashboard/RevenueDashboardRoute";

export const adminRoutes = [
  { path: "/admin/orders/queue", element: OrderQueueRoute },
  { path: "/admin/dashboard/revenue", element: RevenueDashboardRoute }
];
