import Image from "next/image";

export function FimaSuiteLogo({ enabled }: { enabled: boolean }) {
	return (
		<span className="flex min-w-0 items-center gap-2 sm:gap-3">
			<span className="text-lg font-semibold tracking-tight lg:text-2xl">
				Works
				<span className={enabled ? "text-[#d71920]" : "text-green-700"}>
					Recorded
				</span>
			</span>
			{enabled ? (
				<>
					<span aria-hidden="true" className="text-xl font-light text-border">
						|
					</span>
					<span className="flex items-center gap-2">
						<Image
							src="/brands/fima.png"
							alt="FIMA"
							width={117}
							height={36}
							className="h-auto w-14 lg:w-[74px]"
							priority
						/>
						<span className="hidden whitespace-nowrap text-xs font-medium text-muted-foreground sm:inline">
							business suite
						</span>
					</span>
				</>
			) : null}
		</span>
	);
}
