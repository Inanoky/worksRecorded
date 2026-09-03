"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const FULL_GALLERY_SKELETON_KEYS = Array.from(
	{ length: 12 },
	(_, index) => `full-gallery-skeleton-${index + 1}`,
);

const FullPhotoGallery = dynamic(() => import("./FullGalleryView"), {
	ssr: false,
	loading: () => (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
			{FULL_GALLERY_SKELETON_KEYS.map((skeletonKey) => (
				<Skeleton key={skeletonKey} className="aspect-[4/3] rounded-md" />
			))}
		</div>
	),
});

export default FullPhotoGallery;
