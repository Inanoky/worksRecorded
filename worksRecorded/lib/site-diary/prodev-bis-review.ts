import { z } from "zod";

export const prodevBisReviewLabels = {
	do_not_send: "Nesūtīt",
	send_to_bis: "Sūtīt uz BIS",
} as const;

export const prodevBisReviewStatusSchema = z.enum([
	"do_not_send",
	"send_to_bis",
]);
export type ProdevBisReviewStatus = z.infer<typeof prodevBisReviewStatusSchema>;
const eventSchema = z.object({
	id: z.string().uuid(),
	actorId: z.string(),
	actorName: z.string(),
	at: z.string(),
	from: prodevBisReviewStatusSchema,
	to: prodevBisReviewStatusSchema,
});
const reviewSchema = z.object({
	version: z.number().int().nonnegative(),
	status: prodevBisReviewStatusSchema,
	history: z.array(eventSchema),
});
export type ProdevBisReview = z.infer<typeof reviewSchema>;

export const defaultProdevBisReview: ProdevBisReview = {
	version: 0,
	status: "do_not_send",
	history: [],
};

export function readProdevBisReview(metadata: unknown) {
	const value = (metadata as { prodevBisReview?: unknown } | null)
		?.prodevBisReview;
	if (value == null) return undefined;
	const state = reviewSchema.safeParse(value);
	return state.success ? state.data : undefined;
}

export function changeProdevBisReview(
	current: ProdevBisReview,
	change: Omit<z.infer<typeof eventSchema>, "from"> & {
		expectedVersion: number;
	},
): ProdevBisReview {
	if (current.history.some((event) => event.id === change.id)) return current;
	if (current.version !== change.expectedVersion)
		throw new Error("Ieraksta atzīme ir mainīta. Mēģiniet vēlreiz.");
	if (current.status === change.to) return current;
	const { expectedVersion, ...event } = change;
	return {
		version: expectedVersion + 1,
		status: event.to,
		history: [...current.history, { ...event, from: current.status }],
	};
}
