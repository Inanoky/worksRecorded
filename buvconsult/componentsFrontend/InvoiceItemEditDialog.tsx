"use client";
import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/componentsFrontend/ui/dialog";
import { Input } from "@/componentsFrontend/ui/input";
import { Button } from "@/componentsFrontend/ui/button";
import { updateInvoiceItem } from "@/app/actions/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function InvoiceItemEditDialog({ item, open, onOpenChange }) {
  // Only fields belonging to InvoiceItems!
  const initialForm = {
    date: item.date || "",
    item: item.item || "",
    quantity: item.quantity || "",
    unitOfMeasure: item.unitOfMeasure || "",
    pricePerUnitOfMeasure: item.pricePerUnitOfMeasure || "",
    sum: item.sum || "",
    currency: item.currency || "",
    category: item.category || "",
    itemDescription: item.itemDescription || "",
    commentsForUser: item.commentsForUser || "",
    isInvoice: item.isInvoice ? "true" : "false",
  };

  const [form, setForm] = React.useState(initialForm);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  // Ensure form resets when a new item is opened
  React.useEffect(() => {
    if (open) setForm(initialForm);
    // eslint-disable-next-line
  }, [open, item.id]);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      await updateInvoiceItem(item.id, {
        ...form,
        isInvoice: form.isInvoice === "true",
      });
      toast.success("Invoice item updated");
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error("Failed to update item");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Invoice Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-auto">

          <div className="flex items-center gap-2">
            <span className="w-32 text-right">Date : </span>
            <Input name="date" value={form.date} onChange={handleChange} placeholder="Date"/>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 text-right">Item : </span>
            <Input name="item" value={form.item} onChange={handleChange} placeholder="Item"/>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-32 text-right">Quantity : </span>
            <Input name="quantity" value={form.quantity} onChange={handleChange} placeholder="Quantity"/>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-32 text-right">Units : </span>
            <Input name="unitOfMeasure" value={form.unitOfMeasure} onChange={handleChange} placeholder="Unit"/>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-32 text-right">Unit price : </span>
            <Input name="pricePerUnitOfMeasure" value={form.pricePerUnitOfMeasure} onChange={handleChange}
                   placeholder="Unit Price"/>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-32 text-right">Cost : </span>
            <Input name="sum" value={form.sum} onChange={handleChange} placeholder="Sum"/>
          </div>


             <div className="flex items-center gap-2">
            <span className="w-32 text-right">Currency : </span>

          <Input name="currency" value={form.currency} onChange={handleChange} placeholder="Currency" />
             </div>


          <div className="flex items-center gap-2">
            <span className="w-32 text-right">Category : </span>

          <Input name="category" value={form.category} onChange={handleChange} placeholder="Category" />
          </div>





           <div className="flex items-center gap-2">
            <span className="w-32 text-right">Status : </span>
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
