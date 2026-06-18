# Account map

Profile editing:

- `apps/storefront/src/features/profile-editor/model/useProfileEditor.ts`; role: workflow-owner; concern: state; scope: profile save mutation and viewer-profile cache invalidation; domain: profile-editor; anchors: profile save, viewer-profile, cache invalidation, header user name; related: apps/storefront/src/features/profile-editor/api/profileApi.ts; confidence: manual-reviewed
- `apps/storefront/src/features/profile-editor/api/profileApi.ts`; role: data-boundary; concern: data; scope: profile save API; domain: profile-editor; anchors: profile save API; related: apps/storefront/src/features/profile-editor/model/useProfileEditor.ts; confidence: manual-reviewed
- `apps/storefront/src/features/profile-editor/ui/ProfileEditorPage.tsx`; role: surface-entry; concern: surface; scope: profile editor page; domain: profile-editor; anchors: profile edit, profile page; confidence: manual-reviewed
- `apps/storefront/src/routes/profile/ProfileRoute.tsx`; role: route-entry; concern: route; scope: profile route; domain: profile-editor; anchors: profile route, URL; confidence: manual-reviewed

Notification preferences:

- `apps/storefront/src/features/notification-preferences/model/useNotificationPreferenceMutation.ts`; role: behavior-owner; concerns: data, behavior; scope: notification preference mutation and duplicate-call boundary; domain: notification-preferences; anchors: email toggle, API twice, mutation, duplicate call; related: apps/storefront/src/features/notification-preferences/ui/NotificationPreferencesPage.tsx; confidence: manual-reviewed
- `apps/storefront/src/features/notification-preferences/ui/NotificationPreferencesPage.tsx`; role: surface-entry; concern: surface; scope: notification preferences page; domain: notification-preferences; anchors: notification settings, email toggle; related: apps/storefront/src/features/notification-preferences/model/useNotificationPreferenceMutation.ts; confidence: manual-reviewed
- `apps/storefront/src/features/notification-preferences/api/notificationPreferencesApi.ts`; role: data-boundary; concern: data; scope: notification preferences API; domain: notification-preferences; anchors: notification API; confidence: manual-reviewed
- `apps/storefront/src/routes/notification-preferences/NotificationPreferencesRoute.tsx`; role: route-entry; concern: route; scope: notification preferences route; domain: notification-preferences; anchors: route, URL; confidence: manual-reviewed
