export async function downloadTaxInvoice(orderId: string) { return `/business/orders/${orderId}/tax-invoice.pdf`; }
