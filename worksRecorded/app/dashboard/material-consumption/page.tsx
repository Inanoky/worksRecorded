import type { Metadata } from "next";
import { MaterialConsumptionPage } from "@/components/material-consumption/MaterialConsumptionPage";
import { getMaterialConsumption } from "@/server/actions/material-consumption";

export const metadata: Metadata = {
	title: "Materiālu patēriņš | WorksRecorded",
	robots: { index: false, follow: false },
};

export default async function MaterialConsumptionRoute() {
	const data = await getMaterialConsumption();
	return <MaterialConsumptionPage initialData={data} />;
}
