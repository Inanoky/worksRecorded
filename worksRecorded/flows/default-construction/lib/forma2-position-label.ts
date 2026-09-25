export function formatForma2PositionLabel(position: {
	code: string;
	name: string;
}) {
	const code = position.code.trim();
	const prefix = /^\d+(?:\.\d+)*$/.test(code) ? `${code}.` : code;
	return `${prefix ? `${prefix} ` : ""}${position.name}`;
}
