import Image from "next/image";

export function OceltSuiteLogo() {
	return (
		<span className="flex min-w-0 items-center gap-2 sm:gap-3">
			<span className="hidden text-2xl font-semibold tracking-tight xl:inline">
				Works
				<span className="text-[#8a1e02] dark:text-[#fdb812]">Recorded</span>
			</span>
			<span
				aria-hidden="true"
				className="hidden text-xl font-light text-border xl:inline"
			>
				|
			</span>
			<span className="flex flex-col items-start gap-0.5">
				<Image
					src="/brands/ocelt.svg"
					alt="Ošukalns celtniecība"
					width={280}
					height={84}
					className="h-auto w-24 rounded-sm dark:bg-white dark:p-1 lg:w-28"
					priority
				/>
				<span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
					Ocelt business suite
				</span>
			</span>
		</span>
	);
}
