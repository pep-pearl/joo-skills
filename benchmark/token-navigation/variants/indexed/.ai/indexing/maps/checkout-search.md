# Checkout and search map

Checkout coupon:

- `apps/storefront/src/features/coupon/ui/CouponField.tsx`; role: behavior-owner; concern: behavior; anchors: coupon input, coupon field, promo, 체크아웃, 쿠폰 입력; related: apps/storefront/src/features/coupon/api/couponApi.ts
- `apps/storefront/src/features/coupon/api/couponApi.ts`; role: data-boundary; concern: data; anchors: coupon validation API, promo validation, 쿠폰 유효성 검증 API; related: apps/storefront/src/features/coupon/ui/CouponField.tsx
- `apps/storefront/src/routes/checkout/CheckoutRoute.tsx`; role: route-entry; concern: route; anchors: checkout route

Product search URL filters:

- `apps/storefront/src/features/product-search/model/useSearchUrlState.ts`; role: behavior-owner; concern: state; anchors: category filter, URL state, search query, 상품 검색, 새로고침; related: apps/storefront/src/features/product-search/ui/SearchPage.tsx
- `apps/storefront/src/features/product-search/ui/SearchPage.tsx`; role: surface-entry; concern: surface; anchors: product search page, category filter, 상품 검색 화면; related: apps/storefront/src/features/product-search/model/useSearchUrlState.ts
- `apps/storefront/src/routes/search/SearchRoute.tsx`; role: route-entry; concern: route; anchors: search route, URL
