function displayed(element: Element) {
	if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
	for (let node: Element | null = element; node; node = node.parentElement) {
		const style = window.getComputedStyle(node);
		if (
			style.display === "none" ||
			style.visibility === "hidden" ||
			style.opacity === "0"
		)
			return false;
	}
	return true;
}

export function hasActiveProjectEditor(siteId: string) {
	return [...document.querySelectorAll("[data-project-editor]")].some(
		(editor) =>
			editor.getAttribute("data-project-editor") === siteId &&
			editor.getAttribute("data-state") !== "closed" &&
			displayed(editor),
	);
}
