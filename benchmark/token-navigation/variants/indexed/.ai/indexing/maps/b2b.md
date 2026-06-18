# B2B map

Current business app tax invoice flow:

- `apps/b2b/src/features/tax-invoice/ui/InvoiceDownloadButton.tsx`; role: behavior-owner; concern: behavior; scope: tax invoice download button; domain: tax-invoice; anchors: 세금계산서, invoice download, download button; related: apps/b2b/src/features/tax-invoice/api/taxInvoiceApi.ts; confidence: manual-reviewed
- `apps/b2b/src/features/tax-invoice/api/taxInvoiceApi.ts`; role: data-boundary; concern: data; scope: tax invoice download API; domain: tax-invoice; anchors: 세금계산서 API, invoice API, download; related: apps/b2b/src/features/tax-invoice/ui/InvoiceDownloadButton.tsx; confidence: manual-reviewed
- `apps/b2b/src/features/order-detail/ui/B2BOrderDetailPage.tsx`; role: surface-entry; concern: surface; scope: B2B order detail page; domain: order-detail; anchors: B2B 주문 상세, business order detail; confidence: manual-reviewed
- `apps/b2b/src/routes/order-detail/B2BOrderDetailRoute.tsx`; role: route-entry; concern: route; scope: B2B order detail route; domain: order-detail; anchors: B2B route, business URL; confidence: manual-reviewed

Do not use similarly named legacy consumer storefront invoice examples.
