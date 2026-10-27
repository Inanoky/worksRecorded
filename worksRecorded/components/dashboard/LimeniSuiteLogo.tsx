import Image from "next/image";

export function LimeniSuiteLogo() {
	return (
		<span className="flex min-w-0 items-center gap-2 sm:gap-3">
			<span className="hidden text-2xl font-semibold tracking-tight xl:inline">
				Works<span className="text-[#f98d29]">Recorded</span>
			</span>
			<span
				aria-hidden="true"
				className="hidden text-xl font-light text-border xl:inline"
			>
				|
			</span>
			<span className="flex flex-col items-start gap-1">
				<span role="img" aria-label="Līmenī">
					<Image
						src="/brands/limeni-dark.png"
						alt=""
						width={1012}
						height={330}
						className="h-auto w-20 dark:hidden lg:w-24"
						priority
					/>
					<Image
						src="/brands/limeni-white.png"
						alt=""
						width={1012}
						height={330}
						className="hidden h-auto w-20 dark:block lg:w-24"
						priority
					/>
				</span>
				<span className="whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
					business suite
				</span>
			</span>
		</span>
	);
}
