import Image from "next/image";

export function BbbuveSuiteLogo() {
	return (
		<span className="flex min-w-0 items-center gap-2 sm:gap-3">
			<span className="hidden text-2xl font-semibold tracking-tight xl:inline">
				Works<span className="text-primary">Recorded</span>
			</span>
			<span
				aria-hidden="true"
				className="hidden text-xl font-light text-border xl:inline"
			>
				|
			</span>
			<Image
				src="/brands/bbbuve.jpg"
				alt="BB BŪVE"
				width={393}
				height={393}
				className="size-10 rounded-full"
				priority
			/>
			<span className="flex flex-col items-start gap-0.5">
				<span className="whitespace-nowrap text-sm font-semibold tracking-wide">
					BB BŪVE
				</span>
				<span className="whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
					business suite
				</span>
			</span>
		</span>
	);
}
