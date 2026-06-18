# Admin map

Order assignment queue:

- `apps/admin/src/features/order-queue/model/useAssigneeFilter.ts`; role: behavior-owner; concern: state; scope: assignee filter and URL query synchronization; domain: order-queue; anchors: assignee filter, URL query, 담당자 필터; related: apps/admin/src/features/order-queue/ui/OrderQueuePage.tsx; confidence: manual-reviewed
- `apps/admin/src/features/order-queue/ui/OrderQueuePage.tsx`; role: surface-entry; concern: surface; scope: admin order assignment queue page; domain: order-queue; anchors: admin order queue, 배정 큐; related: apps/admin/src/features/order-queue/model/useAssigneeFilter.ts; confidence: manual-reviewed
- `apps/admin/src/routes/order-queue/OrderQueueRoute.tsx`; role: route-entry; concern: route; scope: admin order queue route; domain: order-queue; anchors: route, URL; confidence: manual-reviewed

Revenue dashboard:

- `apps/admin/src/features/revenue-dashboard/ui/RevenueTrendCard.tsx`; role: behavior-owner; concern: behavior; scope: revenue amount and currency rendering; domain: revenue-dashboard; anchors: KRW, currency format, 금액 포맷, revenue card; related: apps/admin/src/features/revenue-dashboard/ui/RevenueDashboardPage.tsx; confidence: manual-reviewed
- `apps/admin/src/features/revenue-dashboard/ui/RevenueDashboardPage.tsx`; role: surface-entry; concern: surface; scope: admin revenue dashboard page; domain: revenue-dashboard; anchors: 매출 대시보드, revenue dashboard; related: apps/admin/src/features/revenue-dashboard/ui/RevenueTrendCard.tsx; confidence: manual-reviewed
- `apps/admin/src/routes/revenue-dashboard/RevenueDashboardRoute.tsx`; role: route-entry; concern: route; scope: revenue dashboard route; domain: revenue-dashboard; anchors: route, URL; confidence: manual-reviewed
