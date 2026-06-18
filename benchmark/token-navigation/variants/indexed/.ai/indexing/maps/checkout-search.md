# Checkout and search map

Checkout coupon:

- `apps/storefront/src/features/coupon/ui/CouponField.tsx`; role: behavior-owner; concern: behavior; scope: checkout coupon input field; domain: coupon; anchors: 쿠폰 입력, coupon field, promo; related: apps/storefront/src/features/coupon/api/couponApi.ts; confidence: manual-reviewed
- `apps/storefront/src/features/coupon/api/couponApi.ts`; role: data-boundary; concern: data; scope: coupon validation API; domain: coupon; anchors: 쿠폰 유효성 검사, coupon validation API, promo validation; related: apps/storefront/src/features/coupon/ui/CouponField.tsx; confidence: manual-reviewed
- `apps/storefront/src/routes/checkout/CheckoutRoute.tsx`; role: route-entry; concern: route; scope: checkout route; domain: checkout; anchors: checkout route, URL; confidence: manual-reviewed

Product search URL filters:

- `apps/storefront/src/features/product-search/model/useSearchUrlState.ts`; role: behavior-owner; concern: state; scope: product-search filter and URL state synchronization; domain: product-search; anchors: category filter, URL state, 새로고침, search query; related: apps/storefront/src/features/product-search/ui/SearchPage.tsx; confidence: manual-reviewed
- `apps/storefront/src/features/product-search/ui/SearchPage.tsx`; role: surface-entry; concern: surface; scope: product search page; domain: product-search; anchors: 상품 검색, search page, category filter; related: apps/storefront/src/features/product-search/model/useSearchUrlState.ts; confidence: manual-reviewed
- `apps/storefront/src/routes/search/SearchRoute.tsx`; role: route-entry; concern: route; scope: product search route; domain: product-search; anchors: search route, URL; confidence: manual-reviewed
