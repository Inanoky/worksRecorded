"use client";

import type { FlowDashboardProps } from "@/components/client-flows/flow-frontend-registry";
import previewRecords from "@/flows/fima/data/preview-records.json";
import {
	type FimaRecord,
	FimaWorkspace,
} from "@/flows/fima/frontend/FimaWorkspace";

export function FimaDashboard({ siteId }: FlowDashboardProps) {
	return (
		<FimaWorkspace
			records={previewRecords as FimaRecord[]}
			embedded
			siteId={siteId}
		/>
	);
}
