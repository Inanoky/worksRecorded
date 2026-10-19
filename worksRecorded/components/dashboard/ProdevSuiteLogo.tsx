import Image from "next/image";

export function ProdevSuiteLogo() {
	return (
		<span className="flex min-w-0 items-center gap-2 sm:gap-3">
			<span className="hidden text-2xl font-semibold tracking-tight xl:inline">
				Works<span className="text-[#f68e2d]">Recorded</span>
			</span>
			<span
				aria-hidden="true"
				className="hidden text-xl font-light text-border xl:inline"
			>
				|
			</span>
			<span className="flex flex-col items-start gap-0.5">
				<Image
					src="/brands/prodev.png"
					alt="PRO DEV"
					width={465}
					height={100}
					className="h-auto w-24 rounded-sm dark:bg-white dark:p-1 lg:w-[116px]"
					priority
				/>
				<span className="whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
					business suite
				</span>
			</span>
		</span>
	);
}
