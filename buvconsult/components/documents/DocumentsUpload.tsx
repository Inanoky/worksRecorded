"use client";

import { use, useState } from "react";
import { UploadDropzone } from "@/app/utils/UploadthingsComponents";
import { toast } from "sonner";
import { saveDocumentsToDB } from "@/server/actions/documents-actions";
import { useRouter } from "next/navigation"; // <-- Add this

export default function DocumentUpload({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter(); // <-- Add this

  // Helper to call the backend action directly
  async function handleUploadComplete(res) {
    const urls = res.map((file) => file.url);
    setFileUrls(urls);

    // Build FormData as expected by your backend
    const formData = new FormData();
    formData.append("siteId", siteId);
    formData.append("fileUrls", JSON.stringify(urls));

    setIsLoading(true);
    try {
      const result = await saveDocumentsToDB(undefined, formData); // Call your server action directly!
      const { accepted, total } = result || { accepted: 0, total: urls.length };


      if (accepted > 0) {
      toast.success(`${accepted}/${total} documents uploaded (Scanned documents not allowed)`);
      } else {
      toast.error(`0/${total} documents uploaded (All were scanned PDFs)`);

      }
      
      router.refresh(); // <----- This refreshes server data (tables)!
    } catch (err) {
      toast.error("Failed to save documents");
    }
    setIsLoading(false);
  }

  return (
    <div>
      <div className="max-w-md mb-10 mx-auto mt-10">
        <UploadDropzone
          endpoint="documentsUploader"
          onClientUploadComplete={handleUploadComplete}
          onUploadError={() => toast.error("Upload failed")}
          appearance={{
            container:
              "border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition",
          }}
        />
        {isLoading && <div className="text-center mt-4 text-sm text-muted-foreground">Processing documents with AI. May take up to 10 minutes... Do not refresh page</div>}
      </div>
    </div>
  );
}
