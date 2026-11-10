import { defaultConstructionFlowModule } from "@/flows/default-construction/module";
import { FLOW_MODULE_KEYS, type FlowModuleDefinition } from "@/lib/flows/types";

export const demoFlowModule = {
	...defaultConstructionFlowModule,
	key: FLOW_MODULE_KEYS.DEMO,
	name: "Žurnāls un izpildshēmas",
	description:
		"FIMA žurnāls un Līmenī izpildshēmas ar izdomāta projekta datiem.",
	entryPoints: {
		frontend: ["flows/demo/frontend.ts"],
		backend: ["flows/default-construction/backend.ts"],
	},
} satisfies FlowModuleDefinition;
