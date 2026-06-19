# Session and cart map

Logout and cart cleanup:

- `packages/session/src/logout.ts`; role: workflow-owner; concern: state; anchors: logout, session clear, session termination, user switch, 로그아웃, 세션 종료; related: apps/storefront/src/features/cart/model/cartStore.ts
- `apps/storefront/src/features/cart/model/cartStore.ts`; role: state-boundary; concern: state; anchors: cart reset, previous user cart, cart cleanup, 장바구니, 초기화; related: packages/session/src/logout.ts
- `packages/session/src/sessionStore.ts`; role: state-boundary; concern: state; anchors: session store, current user
- `apps/storefront/src/features/auth/ui/LogoutButton.tsx`; role: behavior-candidate; concern: behavior; anchors: logout button

Return logout plus cart store for cross-user cart leakage.
