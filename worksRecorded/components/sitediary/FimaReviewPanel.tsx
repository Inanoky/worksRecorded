"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type ReactNode, useRef } from "react";

export function FimaReviewPanel({
	open,
	title,
	description,
	onClose,
	onRestoreFocus,
	children,
}: {
	open: boolean;
	title: string;
	description: string;
	onClose: () => void;
	onRestoreFocus?: () => void;
	children: ReactNode;
}) {
	const panel = useRef<HTMLDivElement>(null);
	return (
		<Dialog.Root
			modal={false}
			open={open}
			onOpenChange={(value) => {
				if (!value) onClose();
			}}
		>
			<Dialog.Portal>
				{open ? (
					<Dialog.Content
						ref={panel}
						onOpenAutoFocus={(event) => {
							event.preventDefault();
							panel.current?.focus({ preventScroll: true });
						}}
						onInteractOutside={(event) => event.preventDefault()}
						onCloseAutoFocus={(event) => {
							event.preventDefault();
							onRestoreFocus?.();
						}}
						className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-[calc(100%-1rem)] flex-col border-l bg-background shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right sm:w-[29rem] sm:max-w-[29rem]"
					>
						<header className="relative space-y-1 border-b px-5 py-4 pr-14">
							<Dialog.Title className="text-lg font-semibold">
								{title}
							</Dialog.Title>
							<Dialog.Description className="text-sm text-muted-foreground">
								{description}
							</Dialog.Description>
							<Dialog.Close asChild>
								<button
									type="button"
									aria-label="Aizvērt ieraksta paneli"
									className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									<X className="size-4" />
								</button>
							</Dialog.Close>
						</header>
						<div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
							{children}
						</div>
					</Dialog.Content>
				) : null}
			</Dialog.Portal>
		</Dialog.Root>
	);
}
