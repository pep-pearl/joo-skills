# Admin map

Order assignment queue:

- `apps/admin/src/features/order-queue/model/useAssigneeFilter.ts`; role: behavior-owner; concern: state; anchors: assignee filter, URL query, URL state, 담당자 필터; related: apps/admin/src/features/order-queue/ui/OrderQueuePage.tsx
- `apps/admin/src/features/order-queue/ui/OrderQueuePage.tsx`; role: surface-entry; concern: surface; anchors: admin order queue, assignment queue, 관리자 주문 배정 화면; related: apps/admin/src/features/order-queue/model/useAssigneeFilter.ts
- `apps/admin/src/routes/order-queue/OrderQueueRoute.tsx`; role: route-entry; concern: route; anchors: admin order queue route

Revenue dashboard:

- `apps/admin/src/features/revenue-dashboard/ui/RevenueTrendCard.tsx`; role: behavior-owner; concern: behavior; anchors: KRW, currency format, revenue card, amount format, 금액 포맷; related: apps/admin/src/features/revenue-dashboard/ui/RevenueDashboardPage.tsx
- `apps/admin/src/features/revenue-dashboard/ui/RevenueDashboardPage.tsx`; role: surface-entry; concern: surface; anchors: revenue dashboard page, admin revenue, 관리자 매출 대시보드; related: apps/admin/src/features/revenue-dashboard/ui/RevenueTrendCard.tsx
- `apps/admin/src/routes/revenue-dashboard/RevenueDashboardRoute.tsx`; role: route-entry; concern: route; anchors: revenue dashboard route
