# B2B map

B2B tax invoice flow:

- `apps/b2b/src/features/tax-invoice/ui/InvoiceDownloadButton.tsx`; role: behavior-owner; concern: behavior; anchors: tax invoice, invoice download, download button, 세금계산서 다운로드; related: apps/b2b/src/features/tax-invoice/api/taxInvoiceApi.ts
- `apps/b2b/src/features/tax-invoice/api/taxInvoiceApi.ts`; role: data-boundary; concern: data; anchors: tax invoice API, invoice API, download, 세금계산서 API; related: apps/b2b/src/features/tax-invoice/ui/InvoiceDownloadButton.tsx
- `apps/b2b/src/features/order-detail/ui/B2BOrderDetailPage.tsx`; role: surface-entry; concern: surface; anchors: B2B order detail, business order detail
- `apps/b2b/src/routes/order-detail/B2BOrderDetailRoute.tsx`; role: route-entry; concern: route; anchors: B2B route, business URL

Do not use consumer storefront invoice examples.
