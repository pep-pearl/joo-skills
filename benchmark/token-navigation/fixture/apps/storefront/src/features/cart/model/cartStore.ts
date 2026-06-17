let items = [{ sku: "SKU-1", quantity: 1 }];
let ownerId: string | null = "viewer-1";
export function resetCartForLogout() { items = []; ownerId = null; }
export function getCartSnapshot() { return { items, ownerId }; }
