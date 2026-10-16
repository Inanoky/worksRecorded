import { z } from "zod";

export const organizationContactReferenceSchema = z
	.string()
	.regex(/^(member|worker):[A-Za-z0-9_-]{1,150}$/);
export const planningContactReferenceSchema = z.union([
	z.string().uuid(),
	organizationContactReferenceSchema,
]);
