import { normalizeForma2PositionCode } from "./forma2-position-code";

export function formatForma2PositionLabel(position: {
	code: string;
	name: string;
}) {
	const code = normalizeForma2PositionCode(position.code);
	const prefix = /^\d+(?:\.\d+)*$/.test(code) ? `${code}.` : code;
	return `${prefix ? `${prefix} ` : ""}${position.name}`;
}
