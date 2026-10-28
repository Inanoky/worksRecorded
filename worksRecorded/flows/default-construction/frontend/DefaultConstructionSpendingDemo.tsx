"use client";

import { useMemo } from "react";
import { createSpendingDemo } from "../lib/spending-demo";
import { DefaultConstructionSpendingPreview } from "./DefaultConstructionSpendingPreview";

export function DefaultConstructionSpendingDemo() {
	const data = useMemo(createSpendingDemo, []);
	return (
		<DefaultConstructionSpendingPreview
			{...data}
			siteName="Projekta analītika"
			demonstration
		/>
	);
}
