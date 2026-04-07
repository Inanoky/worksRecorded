"use client";

// worksRecorded\app\dashboard\sites\[siteId]\settings\updatesiteform.tsx

import { useTransition } from "react";
import { toast } from "sonner";

import GeoMap from "@/components/settings/geomap";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/dashboard/SubmitButtons";
import { updateSiteAction } from "@/server/actions/shared-actions";

type Point = {
  lat: number;
  lng: number;
};

type UpdateSiteFormProps = {
  siteId: string;
  site: {
    name: string;
    description: string;
    subdirectory: string;
    geofenceMapLink: string;
  };
  parsedPolygon: Point[];
};

export function UpdateSiteForm({
  siteId,
  site,
  parsedPolygon,
}: UpdateSiteFormProps) {
  const [isPending, startTransition] = useTransition();

  async function formAction(formData: FormData) {
    startTransition(async () => {
      try {
        await updateSiteAction(formData);
        toast.success("Saved successfully");
      } catch (error) {
        console.error("Failed to update site", error);
        toast.error("Failed to save changes");
      }
    });
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Edit Site Info</CardTitle>
        <CardDescription>
          Update your site’s name, description, or subdirectory.
        </CardDescription>
      </CardHeader>

      <form action={formAction}>
        <input type="hidden" name="siteId" value={siteId} />

        <div className="px-6 pb-2 flex flex-col gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium" htmlFor="name">
              Name
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-base"
              name="name"
              id="name"
              type="text"
              required
              defaultValue={site.name}
              disabled={isPending}
            />
          </div>

          <div>
            <label
              className="block mb-1 text-sm font-medium"
              htmlFor="description"
            >
              Description
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-base"
              name="description"
              id="description"
              type="text"
              required
              defaultValue={site.description}
              disabled={isPending}
            />
          </div>

          <div>
            <label
              className="block mb-1 text-sm font-medium"
              htmlFor="subdirectory"
            >
              Subdirectory
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-base"
              name="subdirectory"
              id="subdirectory"
              type="text"
              required
              defaultValue={site.subdirectory}
              disabled={isPending}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">
              Site area
            </label>
            <GeoMap
              initialPolygon={parsedPolygon}
              initialMapLink={site.geofenceMapLink}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Draw the permitted site area for location-based worker clock-in.
            </p>
          </div>
        </div>

        <CardFooter>
          <SubmitButton text={isPending ? "Saving..." : "Save Changes"} />
        </CardFooter>
      </form>
    </Card>
  );
}