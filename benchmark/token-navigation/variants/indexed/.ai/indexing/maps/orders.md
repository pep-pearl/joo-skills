# Orders map

Storefront order detail:

- `apps/storefront/src/features/order-detail/ui/ShippingStatusBadge.tsx`; role: behavior-owner; concern: behavior; anchors: DELIVERING, shipping status, delivery badge, badge label, 배송 중; related: apps/storefront/src/features/order-detail/ui/OrderDetailPage.tsx
- `apps/storefront/src/features/order-detail/ui/OrderDetailPage.tsx`; role: surface-entry; concern: surface; anchors: order detail page, shipping status, 주문 상세 화면; related: apps/storefront/src/features/order-detail/ui/ShippingStatusBadge.tsx
- `apps/storefront/src/features/order-detail/model/useOrderDetail.ts`; role: state-boundary; concern: state; anchors: order detail data, shipping status
- `apps/storefront/src/features/order-detail/api/orderDetailApi.ts`; role: data-boundary; concern: data; anchors: order detail API
- `apps/storefront/src/routes/order-detail/OrderDetailRoute.tsx`; role: route-entry; concern: route; anchors: order detail route, URL

Prefer the behavior file for label/status tasks; add page only for surface composition.
