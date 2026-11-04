import { createLandingMetadataController } from "./document-metadata";

it("keeps React-owned nodes attached while changing and restoring document metadata", () => {
	document.head.innerHTML =
		'<title>Original</title><meta name="description" content="Original description"><link rel="canonical" href="https://www.worksrecorded.com/lv/Landing">';
	const original = {
		title: "Original",
		meta: { description: ["Original description"] },
		links: [
			{ rel: "canonical", href: "https://www.worksrecorded.com/lv/Landing" },
		],
	};
	const description = document.head.querySelector('meta[name="description"]');
	const canonical = document.head.querySelector('link[rel="canonical"]');
	const controller = createLandingMetadataController();
	controller.apply({
		title: "Pricing",
		meta: { description: ["Pricing description"] },
		links: [
			{
				rel: "canonical",
				href: "https://www.worksrecorded.com/lv/Landing/Pricing",
			},
		],
	});
	expect(description?.parentNode).toBe(document.head);
	expect(canonical?.parentNode).toBe(document.head);
	expect(
		document.head
			.querySelector('meta[name="description"]')
			?.getAttribute("content"),
	).toBe("Pricing description");
	expect(document.title).toBe("Pricing");
	controller.apply(original);
	expect(
		document.head.querySelectorAll('meta[name="description"]'),
	).toHaveLength(1);
	expect(document.title).toBe("Original");
	controller.restore();
	expect(document.head.querySelector('meta[name="description"]')).toBe(
		description,
	);
	expect(document.head.querySelector('link[rel="canonical"]')).toBe(canonical);
	expect(
		document.head
			.querySelector('meta[name="description"]')
			?.getAttribute("content"),
	).toBe("Original description");
	expect(document.title).toBe("Original");
});
