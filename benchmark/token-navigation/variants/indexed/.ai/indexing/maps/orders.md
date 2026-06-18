# Orders map

Current consumer storefront order detail:

- `apps/storefront/src/features/order-detail/ui/ShippingStatusBadge.tsx`; role: behavior-owner; concern: behavior; scope: shipping status label mapping and badge rendering; domain: order-detail; anchors: DELIVERING, 배송 중, shipping status, delivery badge; related: apps/storefront/src/features/order-detail/ui/OrderDetailPage.tsx; confidence: manual-reviewed
- `apps/storefront/src/features/order-detail/ui/OrderDetailPage.tsx`; role: surface-entry; concern: surface; scope: storefront order detail screen composition; domain: order-detail; anchors: 주문 상세, order detail, shipping status; related: apps/storefront/src/features/order-detail/ui/ShippingStatusBadge.tsx; confidence: manual-reviewed
- `apps/storefront/src/features/order-detail/model/useOrderDetail.ts`; role: state-boundary; concern: state; scope: order detail data hook; domain: order-detail; anchors: order detail, shipping status; confidence: manual-reviewed
- `apps/storefront/src/features/order-detail/api/orderDetailApi.ts`; role: data-boundary; concern: data; scope: order detail API; domain: order-detail; anchors: order detail API; confidence: manual-reviewed
- `apps/storefront/src/routes/order-detail/OrderDetailRoute.tsx`; role: route-entry; concern: route; scope: storefront order detail route; domain: order-detail; anchors: route, URL, navigation; confidence: manual-reviewed

Concrete label/status anchors should select the behavior owner before a generic route. Avoid similarly named files under `legacy/`, `archive/`, `examples/`, `apps/playground/`, Storybook, and generated clients.
