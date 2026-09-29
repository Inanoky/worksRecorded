"use client";

import { Ellipsis, ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUploadThing } from "@/lib/utils/UploadthingsComponents";
import { normalizeDiaryPhotoUrls } from "../lib/diary-photos";

type PhotoActionProps = {
  siteId?: string | null;
  recordId?: string | null;
  language?: string;
  onUploaded?: (photos: string[]) => void;
};

export function DiaryPhotoUploadMenuItem({ siteId, recordId, language = "lv", onUploaded }: PhotoActionProps) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const lv = language.startsWith("lv");
  const { startUpload } = useUploadThing("limeniDiaryPhotoUploader", { onUploadProgress: setProgress });
  async function upload(files: File[]) {
    if (busy || !files.length || !siteId || !recordId) return;
    if (files.length > 10 || files.some(file => !file.type.startsWith("image/") || file.size > 16 * 1024 * 1024)) {
      toast.error(lv ? "Izvēlieties līdz 10 attēliem, katru līdz 16 MB." : "Select up to 10 images, each up to 16 MB.");
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const result = await startUpload(files, { siteId, recordId });
      if (!result) throw new Error("Upload failed");
      onUploaded?.(normalizeDiaryPhotoUrls(result.flatMap(file => file.serverData.photos)));
      router.refresh();
      toast.success(lv ? "Foto pievienoti." : "Photos added.");
    } catch {
      toast.error(lv ? "Neizdevās pievienot visus foto. Pārlādējiet ierakstu un pārbaudiet pievienotos foto pirms atkārtota mēģinājuma." : "Could not attach all photos. Reload the record and check attached photos before retrying.");
    } finally {
      setBusy(false);
    }
  }
  if (!siteId || !recordId) return null;
  return <>
    <DropdownMenuItem disabled={busy} onSelect={event => { event.preventDefault(); input.current?.click(); }}>
      <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
      {busy ? `${lv ? "Pievieno" : "Uploading"} ${progress}%` : lv ? "Pievienot foto" : "Add photos"}
    </DropdownMenuItem>
    <input ref={input} type="file" accept="image/*" multiple hidden disabled={busy}
      aria-label={lv ? "Izvēlēties foto" : "Choose photos"}
      onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void upload(files); }} />
  </>;
}

export function DiaryPhotoActions(props: PhotoActionProps) {
  if (!props.siteId || !props.recordId) return null;
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button type="button" variant="outline" size="sm" aria-label={props.language?.startsWith("en") ? "Actions" : "Darbības"}>
        <Ellipsis className="h-4 w-4" aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end"><DiaryPhotoUploadMenuItem {...props} /></DropdownMenuContent>
  </DropdownMenu>;
}
