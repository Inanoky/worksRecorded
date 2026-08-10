import Image from "next/image";
import HeroLaptopDashboard from "@/public/frontend/pages/Home/HeroLaptopDashboardDiagram.png";
import HeroWhatsAppPhone from "@/public/frontend/pages/Home/HeroWhatsAppPhoneSource.png";

export function HeroProductMockup() {
	return (
		<div
			className="relative mx-auto h-[340px] w-full max-w-[800px] sm:h-[470px] lg:h-[610px]"
			role="img"
			aria-label="WorksRecorded dashboard and WhatsApp shown in a laptop and smartphone mockup"
		>
			<div className="absolute top-[12%] right-[-3%] z-10 w-[86%] drop-shadow-[0_28px_32px_rgba(15,23,42,0.22)]">
				<div className="relative aspect-[3/2] overflow-hidden rounded-[clamp(0.65rem,1.7vw,1.25rem)] border-[clamp(4px,0.75vw,7px)] border-slate-950 bg-slate-950">
					<Image
						src={HeroLaptopDashboard}
						alt=""
						fill
						priority
						placeholder="blur"
						sizes="(min-width: 1024px) 50vw, 86vw"
						className="object-cover object-top"
					/>
				</div>

				<div
					className="relative mx-auto h-[clamp(10px,2.2vw,22px)] w-[108%] -translate-y-[2px] rounded-b-[55%] bg-gradient-to-b from-slate-800 via-slate-950 to-black shadow-[0_12px_14px_rgba(15,23,42,0.24)]"
					aria-hidden="true"
				>
					<div className="absolute top-0 left-1/2 h-[22%] w-[18%] -translate-x-1/2 rounded-b-full bg-slate-700/80" />
				</div>
			</div>

			<div className="absolute top-[7%] left-[1%] z-20 h-[80%] aspect-[0.48] overflow-hidden rounded-[14%] drop-shadow-[0_24px_28px_rgba(15,23,42,0.28)] sm:h-[84%] lg:h-[80%]">
				<Image
					src={HeroWhatsAppPhone}
					alt=""
					fill
					priority
					placeholder="blur"
					sizes="(min-width: 1024px) 16vw, 34vw"
					className="scale-[1.055] object-cover"
				/>
			</div>
		</div>
	);
}
