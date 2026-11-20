import { useMemo } from "react";
import MaterialsTableClient from "@/app/dashboard/sites/[siteId]/BIS/Components/materials-table-client";
import { WarehouseInvoiceImport } from "@/flows/default-construction/frontend/WarehouseInvoiceImport";
import { queryClientWarehouseMaterials } from "@/lib/bis/warehouse-client-query";
import { getWarehousePageMessages } from "@/lib/dashboard-i18n";
import { DEMO_SITE_ID } from "../constants";
import type { LocalData } from "./store";
import {
	warehousePositions,
	warehouseRows,
	warehouseSampleUrl,
	warehouseTableActions,
} from "./warehouse";

const noBisConfigurations: never[] = [];
const organizationLanguage = "lv";

export function OzoluWarehouse({ data }: { data: LocalData }) {
	const positions = useMemo(() => warehousePositions(data), [data]);
	const materials = useMemo(() => warehouseRows(data), [data]);
	const pagination = useMemo(
		() =>
			queryClientWarehouseMaterials(
				materials,
				{ pageSize: 50 },
				{ showSpendInsights: true, forma2Positions: positions },
			),
		[materials, positions],
	);
	const copy = getWarehousePageMessages(organizationLanguage);
	return (
		<div className="space-y-6 p-4 md:p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
				<p className="text-sm text-muted-foreground">{copy.description}</p>
			</div>
			<WarehouseInvoiceImport
				siteId={DEMO_SITE_ID}
				organizationLanguage={organizationLanguage}
				sampleInvoiceUrl={warehouseSampleUrl}
			/>
			<MaterialsTableClient
				siteId={DEMO_SITE_ID}
				organizationLanguage={organizationLanguage}
				showSpendInsights
				bisEnabled={false}
				bisBaseUrl=""
				materials={materials}
				isDefaultConstructionFlow
				forma2Enabled={positions.length > 0}
				forma2PositionOptions={positions}
				materialConfigurations={noBisConfigurations}
				materialMeasures={noBisConfigurations}
				materialTypes={noBisConfigurations}
				transferTargets={noBisConfigurations}
				initialPagination={pagination}
				{...warehouseTableActions}
			/>
		</div>
	);
}
