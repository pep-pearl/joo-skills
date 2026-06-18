# AI Navigation Index

Disposable routing hints only. Source/imports/tests are the truth. Map entries use `role`, `concern`, `anchors`, and `related` so concrete behavior owners can be selected before generic routes.

| Request keywords or intent | Read one map shard |
| --- | --- |
| storefront order detail, shipping status, delivery badge | `.ai/indexing/maps/orders.md` |
| profile edit/save, viewer name, profile cache | `.ai/indexing/maps/account.md` |
| logout, session clear, cart survives logout | `.ai/indexing/maps/session-cart.md` |
| admin order queue, assignee filter, queue URL state | `.ai/indexing/maps/admin.md` |
| checkout coupon, promo validation | `.ai/indexing/maps/checkout-search.md` |
| product search filters, category URL state | `.ai/indexing/maps/checkout-search.md` |
| notification preferences, email toggle | `.ai/indexing/maps/account.md` |
| admin revenue dashboard, revenue currency | `.ai/indexing/maps/admin.md` |
| B2B order detail, tax invoice | `.ai/indexing/maps/b2b.md` |

Exact file paths should be opened directly without reading a map. After reading one shard, cover only the task's unresolved concerns and stop.
