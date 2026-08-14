import { getZtcTaskIdentityKey } from "@/flows/ztc-production/lib/ztc-task-identity";

export function updateZtcMetadataProjectName(
	metadataValue: unknown,
	projectName: unknown,
) {
	if (typeof metadataValue !== "string" || !metadataValue.trim()) {
		return metadataValue;
	}

	try {
		const metadata = JSON.parse(metadataValue) as Record<string, unknown>;
		if (
			!metadata ||
			Array.isArray(metadata) ||
			!Object.hasOwn(metadata, "projectName")
		) {
			return metadataValue;
		}

		return JSON.stringify({
			...metadata,
			projectName: String(projectName ?? "").trim(),
		});
	} catch {
		return metadataValue;
	}
}

export function applyZtcProjectNameChange<T extends Record<string, unknown>>(
	row: T,
	projectName: unknown,
) {
	return {
		...row,
		Location: projectName,
		Comments_Custom_2: updateZtcMetadataProjectName(
			row.Comments_Custom_2,
			projectName,
		),
	};
}

type ZtcElementCorrectionAudit = {
	correctedAt: string;
	correctedBy: string;
};

const ZTC_ELEMENT_CORRECTIONS_KEY = "ztcElementCorrections";

export function updateZtcMetadataElementName(
	metadataValue: unknown,
	previousElementName: unknown,
	elementName: unknown,
	audit?: ZtcElementCorrectionAudit,
) {
	if (typeof metadataValue !== "string" || !metadataValue.trim()) {
		return metadataValue;
	}

	const previousName = String(previousElementName ?? "").trim();
	const nextName = String(elementName ?? "").trim();
	if (!previousName || !nextName || previousName === nextName) {
		return metadataValue;
	}

	try {
		const metadata = JSON.parse(metadataValue) as Record<string, unknown>;
		if (!metadata || Array.isArray(metadata)) return metadataValue;

		const matchesPrevious = (value: unknown) =>
			String(value ?? "")
				.trim()
				.toLocaleLowerCase("lv") === previousName.toLocaleLowerCase("lv");
		let changed = false;
		const updated = { ...metadata };

		if (
			Object.hasOwn(updated, "elementName") &&
			matchesPrevious(updated.elementName)
		) {
			updated.elementName = nextName;
			changed = true;
		}

		if (Array.isArray(updated.elements)) {
			updated.elements = updated.elements.map((element) => {
				if (!element || typeof element !== "object" || Array.isArray(element)) {
					return element;
				}

				const entry = element as Record<string, unknown>;
				if (!matchesPrevious(entry.elementName)) return element;
				changed = true;
				return { ...entry, elementName: nextName };
			});
		}

		if (audit) {
			const corrections = Array.isArray(updated[ZTC_ELEMENT_CORRECTIONS_KEY])
				? updated[ZTC_ELEMENT_CORRECTIONS_KEY]
				: [];
			updated[ZTC_ELEMENT_CORRECTIONS_KEY] = [
				...corrections,
				{
					from: previousName,
					to: nextName,
					...audit,
				},
			].slice(-20);
			changed = true;
		}

		return changed ? JSON.stringify(updated) : metadataValue;
	} catch {
		return metadataValue;
	}
}

export function applyZtcElementNameChange<T extends Record<string, unknown>>(
	row: T,
	elementName: unknown,
	options?: {
		previousElementName?: unknown;
		audit?: ZtcElementCorrectionAudit;
	},
) {
	const previousElementName =
		options?.previousElementName ?? row.Location_Custom_1;

	return {
		...row,
		Location_Custom_1: String(elementName ?? "").trim(),
		Comments_Custom_2: updateZtcMetadataElementName(
			row.Comments_Custom_2,
			previousElementName,
			elementName,
			options?.audit,
		),
	};
}

function normalizeRenameIdentity(value: unknown) {
	return String(value ?? "")
		.trim()
		.toLocaleLowerCase("lv")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

function isHourlyRenameUnit(value: unknown) {
	const unit = normalizeRenameIdentity(value).replace(/\.$/, "");
	return ["st", "h", "hr", "hour", "hours", "stunda", "stundas"].includes(unit);
}

export function getZtcSplitTaskRenameGroupKey(
	row: Record<string, unknown> | null | undefined,
) {
	if (!row?.Date_Custom_2) return null;

	const project = normalizeRenameIdentity(row.Location);
	const element = normalizeRenameIdentity(row.Location_Custom_1);
	const work = getZtcTaskIdentityKey(row.Works);
	const workCategory = normalizeRenameIdentity(row.Works_Custom_1);
	if (
		!project ||
		!element ||
		!work ||
		project === "papilddarbi" ||
		element === "papilddarbi" ||
		workCategory === "papilddetalas" ||
		normalizeRenameIdentity(row.Works) === "kvalitates kontrole" ||
		isHourlyRenameUnit(row.Units)
	) {
		return null;
	}

	return JSON.stringify([project, element, work]);
}
