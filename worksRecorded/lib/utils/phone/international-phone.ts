export function getPhoneDigits(raw: string | null | undefined) {
  return (raw ?? "").replace(/\D/g, "");
}

export function normalizeInternationalPhoneForWhatsApp(raw: string | null | undefined) {
  const digits = getPhoneDigits(raw);
  return /^[1-9]\d{8,14}$/.test(digits) ? digits : null;
}

export function requireInternationalPhoneForWhatsApp(
  raw: string | null | undefined,
  validationMessage: string,
) {
  const phone = normalizeInternationalPhoneForWhatsApp(raw);

  if (!phone) {
    throw new Error(validationMessage);
  }

  return phone;
}
