"use client";
import type { FlowDashboardProps } from "@/components/client-flows/flow-frontend-registry";
import { FimaWorkspace } from "./FimaWorkspace";
export function FimaDashboard({ siteId }: FlowDashboardProps) {
	return <FimaWorkspace siteId={siteId} />;
}
