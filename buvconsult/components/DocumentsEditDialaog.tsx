"use client";
import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateDocuments } from "@/app/actions/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function DocumentsEditDialog({ item, open, onOpenChange }) {
  const initialForm = {
    documentName: item.documentName || "",
    documentType: item.documentType || "",
    description: item.description || "",
    url: item.url || "",
  };

  const [form, setForm] = React.useState(initialForm);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

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
      await updateDocuments(item.id, form);
      toast.success("Document updated");
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error("Failed to update document");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-auto">
          <div className="flex items-center gap-2">
            <span className="w-32 text-right">Name:</span>
            <Input name="documentName" value={form.documentName} onChange={handleChange} placeholder="Document Name" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 text-right">Type:</span>
            <Input name="documentType" value={form.documentType} onChange={handleChange} placeholder="Type" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 text-right">Description:</span>
            <Input name="description" value={form.description} onChange={handleChange} placeholder="Description" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 text-right">URL:</span>
            <Input name="url" value={form.url} onChange={handleChange} placeholder="URL" />
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
