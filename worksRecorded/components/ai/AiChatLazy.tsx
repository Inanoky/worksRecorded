"use client";

import dynamic from "next/dynamic";

const AiWidgetRag = dynamic(() => import("./AiChat"), {
  ssr: false,
  loading: () => null,
});

export default AiWidgetRag;
