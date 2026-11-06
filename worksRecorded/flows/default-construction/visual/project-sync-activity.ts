function displayed(element: Element) {
	if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
	for (let node: Element | null = element; node; node = node.parentElement) {
		const style = window.getComputedStyle(node);
		if (style.display === "none" || style.visibility === "hidden") return false;
	}
	return true;
}

export function hasActiveProjectEditor() {
	const focused = document.activeElement;
	if (
		focused &&
		displayed(focused) &&
		(/^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName) ||
			focused.getAttribute("contenteditable") === "true")
	)
		return true;
	return [...document.querySelectorAll('[role="dialog"]')].some(
		(dialog) =>
			dialog.getAttribute("data-state") !== "closed" && displayed(dialog),
	);
}
