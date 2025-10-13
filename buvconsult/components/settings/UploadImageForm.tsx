"use client"

import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import React, {useState} from "react";
import Image from "next/image";
import {UploadDropzone} from "@/lib/utils/UploadthingsComponents";
import {SubmitButton} from "@/components/dashboard/SubmitButtons";
import {toast} from "sonner";
import {UpdateImage} from "@/server/actions/shared-actions";

interface iAppProps {
  siteId: string;
}

export function UploadImageForm({ siteId }: iAppProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

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
              const url = res?.[0]?.url;
              if (url) {
                setImageUrl(url);
                toast.success("Image has been uploaded");
              } else {
                toast.error("Upload finished but no URL was returned");
              }
            }}
            onUploadError={() => {
              toast.error("Something went wrong");
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
              toast.error("Please upload an image first");
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
