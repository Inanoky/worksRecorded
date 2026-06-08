export type UploadThingUrlLike = {
  ufsUrl?: string | null
  url?: string | null
  appUrl?: string | null
}

function readNonEmptyString(value: string | null | undefined) {
  return typeof value === "string" && value.length > 0 ? value : null
}

export function getUploadThingFileUrl(file: UploadThingUrlLike | null | undefined): string | null {
  if (!file) return null

  return readNonEmptyString(file.ufsUrl) ?? readNonEmptyString(file.url) ?? readNonEmptyString(file.appUrl)
}

/** Permanent UploadThing CDN URL from uploadFiles response; requires ufsUrl. */
export function getUploadThingUfsUrl(file: UploadThingUrlLike | null | undefined): string | null {
  return readNonEmptyString(file?.ufsUrl ?? null)
}

/** URL safe to persist as originalAudioUrl (UploadThing CDN only). */
export function resolvePersistableAudioUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url
}
