"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useCallback, useRef } from "react";
import { FimaHistoryControl } from "@/components/sitediary/FimaHistoryControl";
import { getFimaAcceptanceActUrl } from "@/lib/fima/acceptance-acts";
import type { FimaActRow, FimaActSetting } from "@/lib/fima/act-register";
import {
	getFimaActSetting,
	saveFimaActSettings,
} from "@/server/actions/fima-acts";
export function FimaActCommentsPanel({
	row,
	onClose,
	onRestoreFocus,
	onSaved,
	draft,
	onDraftChange,
}: {
	row: FimaActRow | null;
	onClose: () => void;
	onRestoreFocus: () => void;
	onSaved: (key: string, setting: FimaActSetting) => void;
	draft: string;
	onDraftChange: (value: string) => void;
}) {
	const panel = useRef<HTMLDivElement>(null);
	return (
		<Dialog.Root
			modal={false}
			open={!!row}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<Dialog.Portal>
				{row ? (
					<Dialog.Content
						ref={panel}
						onOpenAutoFocus={(event) => {
							event.preventDefault();
							panel.current?.focus({ preventScroll: true });
						}}
						onInteractOutside={(event) => event.preventDefault()}
						onCloseAutoFocus={(event) => {
							event.preventDefault();
							onRestoreFocus();
						}}
						className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-[calc(100%-1rem)] flex-col border-l bg-background shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right sm:w-[29rem] sm:max-w-[29rem]"
					>
						<header className="relative space-y-1 border-b px-5 py-4 pr-14">
							<Dialog.Title className="text-lg font-semibold">
								Akta pārskats
							</Dialog.Title>
							<Dialog.Description className="text-sm text-muted-foreground">
								{row.localNumber} · komentāru un atzīmju vēsture.
							</Dialog.Description>
							<Dialog.Close asChild>
								<button
									type="button"
									aria-label="Aizvērt ieraksta paneli"
									className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									<X className="size-5" />
								</button>
							</Dialog.Close>
						</header>
						<div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
							<section className="space-y-3 rounded-lg border p-3">
								<h2 className="text-sm font-semibold">
									{row.number ?? row.localNumber}
								</h2>
								<p className="whitespace-pre-wrap break-words text-sm">
									{row.title}
								</p>
								<a
									className="text-sm text-primary underline"
									href={
										getFimaAcceptanceActUrl(row.collection, row.id) ?? undefined
									}
									target="_blank"
									rel="noopener noreferrer"
								>
									Atvērt BIS ierakstu
								</a>
							</section>
							<ActHistory
								key={row.key}
								row={row}
								onSaved={onSaved}
								draft={draft}
								onDraftChange={onDraftChange}
							/>
						</div>
					</Dialog.Content>
				) : null}
			</Dialog.Portal>
		</Dialog.Root>
	);
}
function ActHistory({
	row,
	onSaved,
	draft,
	onDraftChange,
}: {
	row: FimaActRow;
	onSaved: (key: string, setting: FimaActSetting) => void;
	draft: string;
	onDraftChange: (value: string) => void;
}) {
	const refresh = useCallback(async () => {
		onSaved(
			row.key,
			await getFimaActSetting({
				siteId: row.siteId,
				collection: row.collection,
				id: row.id,
			}),
		);
	}, [row.siteId, row.collection, row.id, row.key, onSaved]);
	const save = async (text: string, requestId: string) => {
		onSaved(
			row.key,
			await saveFimaActSettings({
				siteId: row.siteId,
				collection: row.collection,
				id: row.id,
				expectedRevision: row.setting.revision,
				kind: "comment",
				text,
				requestId,
			}),
		);
	};
	return (
		<FimaHistoryControl
			history={row.setting.history}
			onRefresh={refresh}
			onSave={save}
			draft={draft}
			onDraftChange={onDraftChange}
		/>
	);
}
