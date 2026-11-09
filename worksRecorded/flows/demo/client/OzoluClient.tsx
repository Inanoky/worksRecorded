"use client";

import dynamic from "next/dynamic";

export const loadOzoluClient = () => import("../generated/workspace");
const Workspace = dynamic(loadOzoluClient, { ssr: false });

export function openOzoluProject() {
	window.history.pushState({ ozoluFrom: window.location.href }, "", "/demo");
	window.scrollTo(0, 0);
}

export function OzoluClient() {
	return <Workspace />;
}
