export function tgemDocumentDisplayName(filename: string) {
	const whatsapp =
		/^whatsapp-invoice-(?:wamid\.)?(.+?)(\.[a-z0-9]{1,8})$/i.exec(filename);
	if (whatsapp) {
		const id = whatsapp[1];
		return `WhatsApp ${id.length > 24 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id}${whatsapp[2]}`;
	}
	if (filename.length <= 64) return filename;
	return `${filename.slice(0, 43)}…${filename.slice(-20)}`;
}
