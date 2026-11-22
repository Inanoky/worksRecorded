"use client";

import { useMemo } from "react";
import { DefaultConstructionForma2View } from "@/flows/default-construction/frontend/DefaultConstructionForma2View";
import { Forma2RefreshContext } from "@/flows/default-construction/frontend/forma2-client-refresh";
import {
	calculateForma2Results,
	type FimaForma2Workspace,
} from "@/flows/default-construction/lib/forma2-results";
import type { createFimaForma2Resource } from "./forma2-resource";

export function FimaForma2View({
	workspace,
	resource,
}: {
	workspace: FimaForma2Workspace;
	resource: ReturnType<typeof createFimaForma2Resource>;
}) {
	const { siteId, organizationLanguage, input, diary } = workspace;
	const { data, mappingRows } = useMemo(
		() => calculateForma2Results(input),
		[input],
	);
	const clientQuantities = useMemo(
		() => ({ diary, mappingRows }),
		[diary, mappingRows],
	);
	return (
		<Forma2RefreshContext.Provider value={() => void resource.refresh(siteId)}>
			<DefaultConstructionForma2View
				siteId={siteId}
				organizationLanguage={organizationLanguage}
				data={data}
				clientQuantities={clientQuantities}
				onActAssignmentsSaved={(update) =>
					resource.patchAssignments(siteId, update)
				}
			/>
		</Forma2RefreshContext.Provider>
	);
}
