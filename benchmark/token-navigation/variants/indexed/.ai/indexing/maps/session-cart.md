# Session and cart map

Logout and cart cleanup:

- `packages/session/src/logout.ts`; role: workflow-owner; concern: state; scope: session logout command and cleanup orchestration; domain: session; anchors: 로그아웃, logout, session clear, user switch; related: apps/storefront/src/features/cart/model/cartStore.ts; confidence: manual-reviewed
- `apps/storefront/src/features/cart/model/cartStore.ts`; role: state-boundary; concern: state; scope: cart state and reset behavior; domain: cart; anchors: 장바구니 초기화, cart reset, previous user cart; related: packages/session/src/logout.ts; confidence: manual-reviewed
- `packages/session/src/sessionStore.ts`; role: state-boundary; concern: state; scope: session state; domain: session; anchors: session store, current user; confidence: manual-reviewed
- `apps/storefront/src/features/auth/ui/LogoutButton.tsx`; role: behavior-candidate; concern: behavior; scope: logout UI trigger; domain: auth; anchors: logout button; confidence: manual-reviewed

Follow only the import that owns an uncovered logout/cart concern. Stop when session termination and cart reset are both covered.
