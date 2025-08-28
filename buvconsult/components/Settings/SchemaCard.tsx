"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { deleteSchemaBySiteId } from "@/app/actions/siteDiaryActions";
import { SubmitButton } from "@/app/components/dashboard/SubmitButtons";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SchemaCardProps {
  siteId: string;
  fileUrl: string | null;
  schemaExists: boolean;
}

export function SchemaCard({ siteId, fileUrl, schemaExists }: SchemaCardProps) {
  const router = useRouter();

  if (!schemaExists) return null;

  async function action(formData: FormData) {
    try {
      const result = await deleteSchemaBySiteId(formData);
      if (result.success) {
        toast.success("Schema deleted successfully ✅");
        router.refresh();
      }
    } catch (err) {
      console.error("Delete schema failed", err);
      toast.error("Failed to delete schema ❌");
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Schema Files</CardTitle>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-32 pr-4">
          <div className="flex items-center justify-between gap-2 border rounded-md p-2 mb-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="text-green-600 w-5 h-5" />
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                schema.xlsx
              </span>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="secondary" size="sm">
                <a href={fileUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                  Download
                </a>
              </Button>

              <form action={action}>
                <input type="hidden" name="siteId" value={siteId} />
                <SubmitButton text="Delete" variant="destructive" />
              </form>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
