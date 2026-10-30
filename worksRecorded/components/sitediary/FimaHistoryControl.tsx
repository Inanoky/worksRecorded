"use client";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
export type FimaHistoryEvent = {
	id: string;
	kind: string;
	text: string;
	actorName: string;
	at: string;
};
export function FimaHistoryControl({
	history,
	onRefresh,
	onSave,
	draft,
	onDraftChange,
}: {
	history: FimaHistoryEvent[];
	onRefresh: () => Promise<void>;
	onSave: (text: string, requestId: string) => Promise<void>;
	draft?: string;
	onDraftChange?: (value: string) => void;
}) {
	const [ownDraft, setOwnDraft] = useState("");
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const request = useRef<string | null>(null);
	const sending = useRef(false);
	const inputId = useId();
	const text = draft ?? ownDraft;
	const setText = onDraftChange ?? setOwnDraft;
	useEffect(() => {
		let active = true;
		setLoading(true);
		setError(null);
		const refresh = async () => {
			try {
				await onRefresh();
				if (active) {
					setError(null);
				}
			} catch (error) {
				if (active)
					setError(
						error instanceof Error
							? error.message
							: "Neizdevās ielādēt vēsturi.",
					);
			} finally {
				if (active) setLoading(false);
			}
		};
		void refresh();
		const timer = setInterval(() => void refresh(), 15000);
		return () => {
			active = false;
			clearInterval(timer);
		};
	}, [onRefresh]);
	return (
		<section
			className="flex min-h-0 flex-1 flex-col gap-4"
			aria-label="Komentāri un izmaiņu vēsture"
		>
			<h3 className="font-semibold">Komentāri un izmaiņu vēsture</h3>
			{loading ? (
				<output className="text-xs text-muted-foreground">
					Atjauno vēsturi...
				</output>
			) : null}
			{error ? (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			) : null}
			<div className="space-y-3" aria-live="polite">
				{history.length ? (
					history.map((event) => (
						<article
							className="rounded-lg border bg-muted/20 p-3"
							key={event.id}
						>
							<p className="text-xs text-muted-foreground">
								{event.actorName} · {new Date(event.at).toLocaleString("lv-LV")}
								{event.kind === "status"
									? " · Atzīme"
									: event.kind !== "comment"
										? " · Izmaiņa"
										: ""}
							</p>
							<p className="mt-1 whitespace-pre-wrap break-words text-sm">
								{event.text}
							</p>
						</article>
					))
				) : (
					<p className="text-sm text-muted-foreground">Komentāru vēl nav.</p>
				)}
			</div>
			<form
				className="space-y-2 border-t pt-4"
				onSubmit={async (event) => {
					event.preventDefault();
					if (sending.current || !text.trim()) return;
					sending.current = true;
					setSaving(true);
					request.current ??= crypto.randomUUID();
					try {
						await onSave(text, request.current);
						setText("");
						request.current = null;
					} catch (error) {
						toast.error(
							error instanceof Error
								? error.message
								: "Neizdevās saglabāt komentāru.",
						);
					} finally {
						sending.current = false;
						setSaving(false);
					}
				}}
			>
				<label className="text-sm font-medium" htmlFor={inputId}>
					Jauns komentārs
				</label>
				<Textarea
					id={inputId}
					maxLength={4000}
					rows={4}
					disabled={saving}
					value={text}
					onChange={(event) => {
						setText(event.target.value);
						request.current = null;
					}}
				/>
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs text-muted-foreground">
						{text.length}/4000
					</span>
					<Button type="submit" disabled={saving || !text.trim()}>
						{saving ? "Saglabā..." : "Pievienot komentāru"}
					</Button>
				</div>
			</form>
		</section>
	);
}
