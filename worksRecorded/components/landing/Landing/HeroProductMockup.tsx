import Image from "next/image";
import HeroDevicesMockup from "@/public/frontend/pages/Home/HeroDevicesMockupTransparent.png";

export function HeroProductMockup() {
	return (
		<div
			className="relative mx-auto h-[340px] w-full max-w-[800px] sm:h-[470px] lg:h-[610px]"
			role="img"
			aria-label="WorksRecorded dashboard and WhatsApp shown in a laptop and smartphone mockup"
		>
			<Image
				src={HeroDevicesMockup}
				alt="WorksRecorded dashboard on a laptop and a WorksRecorded WhatsApp conversation on a smartphone"
				fill
				priority
				placeholder="blur"
				sizes="(min-width: 1024px) 58vw, 100vw"
				className="scale-[1.12] object-contain drop-shadow-[0_28px_32px_rgba(15,23,42,0.2)]"
			/>
		</div>
	);
}
