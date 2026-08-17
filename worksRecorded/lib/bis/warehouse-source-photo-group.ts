export function normalizeWarehouseSourcePhoto(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}
