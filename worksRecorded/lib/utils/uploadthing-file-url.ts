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
