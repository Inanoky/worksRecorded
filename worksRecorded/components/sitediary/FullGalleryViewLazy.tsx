"use client";

import dynamic from "next/dynamic";

const FullPhotoGallery = dynamic(() => import("./FullGalleryView"), {
  ssr: false,
  loading: () => null,
});

export default FullPhotoGallery;
