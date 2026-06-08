"use client"

import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import React, {useState} from "react";
import Image from "next/image";
import {UploadDropzone} from "@/lib/utils/UploadthingsComponents";
import {SubmitButton} from "@/components/dashboard/SubmitButtons";
import {toast} from "sonner";
import {UpdateImage} from "@/server/actions/shared-actions";
import { getToastMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";
import { getUploadThingFileUrl } from "@/lib/utils/uploadthing-file-url";

interface iAppProps {
  siteId: string;
  organizationLanguage?: string | null;
}

export function UploadImageForm({ siteId, organizationLanguage }: iAppProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const toastMessages = getToastMessages(normalizeOrganizationLanguage(organizationLanguage));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image</CardTitle>
        <CardDescription>This is the image of your site — change it here.</CardDescription>
      </CardHeader>

      <CardContent>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Uploaded Image"
            width={200}
            height={200}
            className="size-[200px] object-cover rounded-lg"
          />
        ) : (
          <UploadDropzone
            endpoint="imageUploader"
            onClientUploadComplete={(res) => {
              const url = getUploadThingFileUrl(res?.[0]);
              if (url) {
                setImageUrl(url);
                toast.success(toastMessages.imageUploaded);
              } else {
                toast.error(toastMessages.uploadNoUrl);
              }
            }}
            onUploadError={() => {
              toast.error(toastMessages.somethingWentWrong);
            }}
          />
        )}
      </CardContent>

      <CardFooter>
        <form
          action={UpdateImage}
          onSubmit={(e) => {
            if (!imageUrl) {
              e.preventDefault();
              toast.error(toastMessages.uploadImageFirst);
            }
          }}
        >
          <input type="hidden" name="siteId" value={siteId} />
          <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
          <SubmitButton text="Change image" disabled={!imageUrl} />
        </form>
      </CardFooter>
    </Card>
  );
}
