import { type Action, toast } from "sonner";
import {
	type PlanningWhatsAppSendResult,
	readWasenderTaskReceipt,
	sendPlanningWhatsAppTask,
} from "./planning-whatsapp-send-client";

type Task = Omit<Parameters<typeof sendPlanningWhatsAppTask>[0], "signal">;

const activeTasks = new Set<string>();
const hasQueuedImages = (result: PlanningWhatsAppSendResult) =>
	result.items.some(({ status }) => status === "queued");

export function startPlanningWhatsAppSend(
	task: Task,
	label: string,
	onResult?: (result: PlanningWhatsAppSendResult) => void,
) {
	const key = `${task.siteId}:${task.planId}`;
	const id = task.clientRequestId;
	const retry: Action = {
		label: "Atkārtot nenosūtītos",
		onClick(event) {
			event.preventDefault();
			void run();
		},
	};
	async function run(receipt?: PlanningWhatsAppSendResult) {
		if (activeTasks.has(key)) {
			toast.info("Šis WhatsApp uzdevums jau tiek sūtīts.");
			return;
		}
		activeTasks.add(key);
		toast.loading(
			receipt
				? "Pārbauda WhatsApp nosūtīšanu…"
				: "Nosūta WhatsApp darba uzdevumu…",
			{ id, description: label },
		);
		try {
			let result =
				receipt ??
				(await sendPlanningWhatsAppTask({
					...task,
					signal: new AbortController().signal,
				}));
			if (!receipt) onResult?.(result);
			if (task.group && hasQueuedImages(result)) {
				const signal = AbortSignal.timeout(90_000);
				const initial = result;
				for (
					let attempt = 0;
					attempt < 15 && hasQueuedImages(result);
					attempt++
				) {
					await new Promise((resolve) => setTimeout(resolve, 5000));
					if (signal.aborted) break;
					const updated = await readWasenderTaskReceipt(
						task.siteId,
						result.sendId,
						signal,
					).catch(() => null);
					if (updated) result = updated;
				}
				if (result !== initial) onResult?.(result);
			}
			if (result.status === "sent") {
				toast.success("Darba uzdevums nosūtīts WhatsApp.", {
					id,
					description: label,
				});
				return;
			}

			const sentCount = result.items.filter(({ status }) =>
				["sent", "delivered", "read"].includes(status),
			).length;
			const queuedCount = result.items.filter(
				({ status }) => status === "queued",
			).length;
			const error = result.items.find((item) => item.error)?.error;
			const description = [
				label,
				queuedCount
					? `WaSenderAPI pieņēma ${sentCount + queuedCount} no ${result.items.length} attēliem.`
					: `Nosūtīti ${sentCount} no ${result.items.length} attēliem.`,
				error,
			]
				.filter(Boolean)
				.join("\n");
			const canRetry =
				result.items.some(
					({ status }) => status === "failed" || status === "pending",
				) && !result.items.some(({ status }) => status === "processing");
			const action: Action | undefined = canRetry
				? retry
				: queuedCount
					? {
							label: "Pārbaudīt vēlreiz",
							onClick(event) {
								event.preventDefault();
								void run(result);
							},
						}
					: undefined;
			const options = { id, description, action, duration: 12_000 };
			if (result.status === "failed") {
				toast.error("Neizdevās nosūtīt WhatsApp darba uzdevumu.", options);
			} else {
				toast.warning(
					result.status === "partial"
						? "WhatsApp darba uzdevums nosūtīts daļēji."
						: "WhatsApp nosūtīšana vēl nav apstiprināta.",
					options,
				);
			}
		} catch (error) {
			toast.error("Neizdevās nosūtīt WhatsApp darba uzdevumu.", {
				id,
				description:
					error instanceof Error ? `${label}\n${error.message}` : label,
				action: retry,
				duration: 12_000,
			});
		} finally {
			activeTasks.delete(key);
		}
	}
	void run();
}
