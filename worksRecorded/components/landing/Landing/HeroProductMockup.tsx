import Image from "next/image";
import { WhatsAppChatPhone } from "@/components/landing/SiteDiary/WhatsAppConversationAnimation";
import HeroLaptopDashboard from "@/public/frontend/pages/Home/HeroLaptopDashboardDiagram.png";

export function HeroProductMockup({ locale }: { locale: string }) {
	return (
		<div
			className="relative mx-auto h-[340px] w-full max-w-[800px] sm:h-[470px] lg:h-[610px]"
			role="img"
			aria-label="WorksRecorded dashboard and an animated WhatsApp site diary conversation"
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

			<div className="absolute left-[1%] top-[1%] z-20 w-[390px] origin-top-left scale-[0.43] sm:scale-[0.58] lg:scale-[0.74] xl:scale-[0.78]">
				<WhatsAppChatPhone locale={locale} />
			</div>
		</div>
	);
}
