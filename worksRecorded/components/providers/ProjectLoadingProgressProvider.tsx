"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { ProjectLoadingProgress } from "./ProjectLoadingProgressBar";

const Context = createContext(false);
const noSites: readonly string[] = [];
const Preparation = createContext<{
	visual: boolean;
	visualSites: readonly string[];
	reports: Record<string, Record<string, "done" | "error">>;
	report: (siteId: string, step: string, status: "done" | "error") => void;
	reset: (siteId: string) => void;
} | null>(null);
const Scope = createContext<string | undefined>(undefined);
const steps = [
	["project", "Projekta atvēršana"],
	["settings", "Projekta iestatījumi"],
	["diary", "Būvdarbu žurnāls"],
	["visual-module", "Izpildshēmu rīki"],
	["visual-index", "Stāvi un rasējumi"],
	["visual-drawing", "Izpildes zonas"],
	["visual-planning", "Plānotie darbi"],
	["visual-preview", "Rasējuma priekšskatījums"],
] as const;

export function ProjectLoadingProgressProvider({
	enabled,
	visualPreloadEnabled = false,
	visualPreloadSites = noSites,
	children,
}: {
	enabled: boolean;
	visualPreloadEnabled?: boolean;
	visualPreloadSites?: readonly string[];
	children: ReactNode;
}) {
	const [reports, setReports] = useState<
		Record<string, Record<string, "done" | "error">>
	>({});
	const report = useCallback(
		(siteId: string, step: string, status: "done" | "error") => {
			setReports((current) =>
				current[siteId]?.[step] === status
					? current
					: { ...current, [siteId]: { ...current[siteId], [step]: status } },
			);
		},
		[],
	);
	const reset = useCallback(
		(siteId: string) => setReports((current) => ({ ...current, [siteId]: {} })),
		[],
	);
	const value = useMemo(
		() => ({
			visual: visualPreloadEnabled,
			visualSites: visualPreloadSites,
			reports,
			report,
			reset,
		}),
		[visualPreloadEnabled, visualPreloadSites, reports, report, reset],
	);
	return (
		<Context.Provider value={enabled}>
			<Preparation.Provider value={value}>{children}</Preparation.Provider>
		</Context.Provider>
	);
}

export function ProjectPreparationScope({
	siteId,
	children,
}: {
	siteId: string;
	children: ReactNode;
}) {
	return <Scope.Provider value={siteId}>{children}</Scope.Provider>;
}

export function useVisualProjectPreload(siteId?: string) {
	const scope = useContext(Scope);
	const preparation = useContext(Preparation);
	return (
		!!preparation &&
		(preparation.visual ||
			preparation.visualSites.includes(siteId ?? scope ?? ""))
	);
}

export function useProjectPreparation(
	siteId?: string,
): ProjectLoadingProgress | null {
	const scope = useContext(Scope);
	const preparation = useContext(Preparation);
	const id = siteId ?? scope;
	if (!preparation || !id) return null;
	const reports = preparation.reports[id] ?? {};
	const visible = steps.filter(
		([key]) =>
			preparation.visual ||
			preparation.visualSites.includes(id) ||
			!key.startsWith("visual-"),
	);
	return {
		total: visible.length,
		completed: visible.filter(([key]) => reports[key]).length,
		steps: visible.map(([key, label]) => ({
			label,
			status: reports[key] ?? "pending",
		})),
	};
}

export function useProjectPreparationReporter(siteId: string) {
	const report = useContext(Preparation)?.report;
	return useCallback(
		(step: string, status: "done" | "error" = "done") =>
			report?.(siteId, step, status),
		[report, siteId],
	);
}

export function useProjectPreparationReset(siteId: string) {
	const reset = useContext(Preparation)?.reset;
	return useCallback(() => reset?.(siteId), [reset, siteId]);
}

export function useProjectPreparationStep(
	siteId: string,
	step: string,
	done: boolean,
	failed = false,
) {
	const report = useProjectPreparationReporter(siteId);
	useEffect(() => {
		if (siteId && (done || failed)) report(step, failed ? "error" : "done");
	}, [siteId, step, done, failed, report]);
}

export function useProjectLoadingProgress() {
	return useContext(Context);
}
