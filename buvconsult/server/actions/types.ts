export type SavePhotoArgs = {
  // NEW: Accept workerId
  workerId: string | null; 
  // RETAIN: Keep userId for Site Manager route compatibility
  userId: string | null;    // from your prisma.user  
  siteId: string | null;    // user.lastSelectedSiteIdforWhatsapp
  url?: string | null;   // public URL (e.g., UploadThing ufsUrl)
  fileUrl?: string | null;   // if you also want to store separately
  comment?: string | null;   // WhatsApp caption / annotation
  location?: string | null;   // optional manual location string
  date?: Date | null;   // defaults to now if not provided
};

export type GetPhotosByDateArgs = {
  siteId: string | null;
  startISO: string; // inclusive
  endISO: string;   // exclusive
};


export type Args = {
  siteId: string;
  year: number;
  month: number; // 0-based (Jan = 0)
};