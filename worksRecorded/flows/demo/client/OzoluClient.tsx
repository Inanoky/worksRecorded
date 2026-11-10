"use client";

import dynamic from "next/dynamic";
import { ProjectOpeningOverlay } from "@/components/providers/ProjectOpeningOverlay";

export const loadOzoluClient = () => import("../generated/workspace");
const Workspace = dynamic(loadOzoluClient, {
	ssr: false,
	loading: () => <ProjectOpeningOverlay label="Ielādē projektu…" />,
});

export function openOzoluProject() {
	window.history.pushState({ ozoluFrom: window.location.href }, "", "/demo");
	window.scrollTo(0, 0);
}

export function OzoluClient() {
	return <Workspace />;
}
