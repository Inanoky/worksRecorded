import type { LandingDocumentMetadata } from "./landing-routes";

const metadataSelector =
	'meta[name="description"], meta[name="keywords"], meta[name="content-language"], meta[name="geo.region"], meta[name="geo.placename"], meta[name^="twitter:"], meta[property^="og:"]';

export function createLandingMetadataController() {
	const originals = Array.from(
		document.head.querySelectorAll(
			`${metadataSelector}, link[rel="canonical"], link[rel="alternate"][hreflang]`,
		),
		(node) => ({
			node,
			attributes: Array.from(
				node.attributes,
				(attribute) => [attribute.name, attribute.value] as const,
			),
		}),
	);
	const titles = Array.from(
		document.head.querySelectorAll("title"),
		(node) => ({ node, text: node.textContent }),
	);
	const owned = new Set<Element>();
	function clearOwned() {
		for (const node of owned) node.remove();
		owned.clear();
	}
	return {
		apply(metadata: LandingDocumentMetadata) {
			clearOwned();
			for (const { node } of originals) {
				if (!node.isConnected) continue;
				if (node instanceof HTMLLinkElement) node.rel = "wr-landing-inactive";
				else
					node.setAttribute(
						node.hasAttribute("property") ? "property" : "name",
						"wr-landing-inactive",
					);
			}
			let title = document.head.querySelector("title");
			if (!title) {
				title = document.createElement("title");
				document.head.append(title);
				owned.add(title);
			}
			title.textContent = metadata.title;
			for (const [key, values] of Object.entries(metadata.meta)) {
				for (const value of values) {
					const node = document.createElement("meta");
					node.setAttribute(key.startsWith("og:") ? "property" : "name", key);
					node.content = value;
					document.head.append(node);
					owned.add(node);
				}
			}
			for (const value of metadata.links) {
				const node = document.createElement("link");
				node.rel = value.rel;
				node.href = value.href;
				if (value.hrefLang) node.hreflang = value.hrefLang;
				document.head.append(node);
				owned.add(node);
			}
		},
		restore() {
			clearOwned();
			for (const { node, attributes } of originals) {
				if (node.isConnected)
					for (const [name, value] of attributes)
						node.setAttribute(name, value);
			}
			for (const { node, text } of titles)
				if (node.isConnected) node.textContent = text;
		},
	};
}
