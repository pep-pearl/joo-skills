import { downloadTaxInvoice } from "../api/taxInvoiceApi";
export function InvoiceDownloadButton({ orderId }: { orderId: string }) {
  return <button onClick={() => void downloadTaxInvoice(orderId)}>세금계산서</button>;
}
