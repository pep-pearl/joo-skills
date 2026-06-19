# Account map

Profile editing:

- `apps/storefront/src/features/profile-editor/model/useProfileEditor.ts`; role: workflow-owner; concern: state; anchors: profile save, viewer-profile, cache invalidation, header user name, 프로필 저장, 캐시 무효화; related: apps/storefront/src/features/profile-editor/api/profileApi.ts
- `apps/storefront/src/features/profile-editor/api/profileApi.ts`; role: data-boundary; concern: data; anchors: profile save API; related: apps/storefront/src/features/profile-editor/model/useProfileEditor.ts
- `apps/storefront/src/features/profile-editor/ui/ProfileEditorPage.tsx`; role: surface-entry; concern: surface; anchors: profile editor page
- `apps/storefront/src/routes/profile/ProfileRoute.tsx`; role: route-entry; concern: route; anchors: profile route, URL

Notification preferences:

- `apps/storefront/src/features/notification-preferences/model/useNotificationPreferenceMutation.ts`; role: behavior-owner; concerns: behavior,data; anchors: email toggle, API twice, mutation, duplicate call, 알림 설정; related: apps/storefront/src/features/notification-preferences/ui/NotificationPreferencesPage.tsx
- `apps/storefront/src/features/notification-preferences/ui/NotificationPreferencesPage.tsx`; role: surface-entry; concern: surface; anchors: notification settings page, email toggle, 알림 설정 페이지; related: apps/storefront/src/features/notification-preferences/model/useNotificationPreferenceMutation.ts
- `apps/storefront/src/features/notification-preferences/api/notificationPreferencesApi.ts`; role: data-boundary; concern: data; anchors: notification API
- `apps/storefront/src/routes/notification-preferences/NotificationPreferencesRoute.tsx`; role: route-entry; concern: route; anchors: notification preferences route
