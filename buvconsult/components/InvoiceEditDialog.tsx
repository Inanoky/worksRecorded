"use client";
import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateInvoice } from "@/app/actions/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function InvoiceEditDialog({ invoice, open, onOpenChange }) {

















  const [form, setForm] = React.useState({
    invoiceNumber: invoice.invoiceNumber || "",
    sellerName: invoice.sellerName || "",
    buyerName: invoice.buyerName || "",
    invoiceDate: invoice.invoiceDate || "",
    paymentDate: invoice.paymentDate || "",
    isCreditDebitProformaOrAdvanced: invoice.isCreditDebitProformaOrAdvanced || "",
    isInvoice: invoice.isInvoice ? "true" : "false",
  });

    // 👇 This will reset the form when the dialog is opened for a new invoice
  React.useEffect(() => {
    setForm({
      invoiceNumber: invoice.invoiceNumber || "",
      sellerName: invoice.sellerName || "",
      buyerName: invoice.buyerName || "",
      invoiceDate: invoice.invoiceDate || "",
      paymentDate: invoice.paymentDate || "",
      isCreditDebitProformaOrAdvanced: invoice.isCreditDebitProformaOrAdvanced || "",
      isInvoice: invoice.isInvoice ? "true" : "false",
    });
  }, [invoice, open]); // depend on both invoice and open










  const router = useRouter();
  const [loading, setLoading] = React.useState(false);







  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      await updateInvoice(invoice.id, {
        invoiceNumber: form.invoiceNumber,
        sellerName: form.sellerName,
        buyerName: form.buyerName,
        invoiceDate: form.invoiceDate,
        paymentDate: form.paymentDate,
        isCreditDebitProformaOrAdvanced: form.isCreditDebitProformaOrAdvanced,
        isInvoice: form.isInvoice === "true",
      });
      toast.success("Invoice updated");
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error("Failed to update invoice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-auto">


          <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-right">Inv. Number : </span>
          <Input name="invoiceNumber" value={form.invoiceNumber} onChange={handleChange} placeholder="Invoice #" />
          </div>

            <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-right">Seller : </span>
            <Input name="sellerName" value={form.sellerName} onChange={handleChange} placeholder="Seller Name" />
            </div>

         <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-right">Buyer : </span>
          <Input name="buyerName" value={form.buyerName} onChange={handleChange} placeholder="Buyer Name" />
         </div>
         <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-right">Inv. Date : </span>

          <Input name="invoiceDate" value={form.invoiceDate} onChange={handleChange} placeholder="Invoice Date" />
          </div>
           <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-right">Payment Date : </span>

           <Input name="paymentDate" value={form.paymentDate} onChange={handleChange} placeholder="Payment Date" />
           </div>
         <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-right">Type : </span>

          <Input name="isCreditDebitProformaOrAdvanced" value={form.isCreditDebitProformaOrAdvanced} onChange={handleChange} placeholder="Type" />
         </div>

           <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-right">Status : </span>


           <select name="isInvoice" value={form.isInvoice} onChange={handleChange} className="w-full border rounded px-2 py-1">
            <option value="true">Is Invoice</option>
            <option value="false">Not Invoice</option>
          </select>
           </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} loading={loading}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
