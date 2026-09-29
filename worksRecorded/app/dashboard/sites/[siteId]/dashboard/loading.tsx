"use client";

import { ProjectOpeningOverlay } from "@/components/providers/ProjectOpeningOverlay";
import { useRetainedDiaryReady } from "@/flows/default-construction/frontend/RetainedLimeniDiary";

export default function ConstructionJournalLoading() {
	const ready = useRetainedDiaryReady();
	if (ready) return null;
	return <ProjectOpeningOverlay label="Ielādē būvdarbu žurnālu…" />;
}
