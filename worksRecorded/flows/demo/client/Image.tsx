import type { ComponentProps } from "react";
export default function Image({
	src,
	alt,
	fill,
	priority,
	unoptimized,
	quality,
	loader,
	placeholder,
	blurDataURL,
	...props
}: ComponentProps<"img"> & {
	src: any;
	fill?: boolean;
	priority?: boolean;
	unoptimized?: boolean;
	quality?: number;
	loader?: unknown;
	placeholder?: string;
	blurDataURL?: string;
}) {
	return (
		<img
			{...props}
			alt={alt}
			src={typeof src === "string" ? src : src?.src}
			style={{
				...props.style,
				...(fill
					? { position: "absolute", inset: 0, width: "100%", height: "100%" }
					: {}),
			}}
		/>
	);
}
