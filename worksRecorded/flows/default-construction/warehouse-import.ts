export const WAREHOUSE_IMPORT_MAX_FILES = 20;
export const WAREHOUSE_IMPORT_MAX_BYTES = 16 * 1024 * 1024;
export const WAREHOUSE_IMPORT_TYPES = [
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;

export function validateWarehouseImportFiles(
	files: ReadonlyArray<{ type: string; size: number }>,
) {
	if (!files.length || files.length > WAREHOUSE_IMPORT_MAX_FILES)
		return "file_count";
	if (
		files.some(
			(file) => !WAREHOUSE_IMPORT_TYPES.some((type) => type === file.type),
		)
	)
		return "file_type";
	if (
		files.some(
			(file) => file.size <= 0 || file.size > WAREHOUSE_IMPORT_MAX_BYTES,
		)
	)
		return "file_size";
	return null;
}
