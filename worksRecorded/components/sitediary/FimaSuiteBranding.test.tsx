import { render, screen } from "@testing-library/react";
import { FimaSuiteLogo } from "./FimaSuiteLogo";
import { FimaSuiteTheme } from "./FimaSuiteTheme";

it("adds the official FIMA logo and business suite label only when enabled", () => {
	const { rerender } = render(<FimaSuiteLogo enabled={false} />);
	expect(screen.queryByAltText("FIMA")).not.toBeInTheDocument();
	expect(screen.queryByText("business suite")).not.toBeInTheDocument();
	rerender(<FimaSuiteLogo enabled />);
	expect(screen.getByAltText("FIMA")).toBeInTheDocument();
	expect(screen.getByText("business suite")).toBeInTheDocument();
});
it("applies the FIMA theme to portal controls and removes it when leaving FIMA", () => {
	const { rerender } = render(<FimaSuiteTheme enabled />);
	expect(document.documentElement.dataset.fimaSuite).toBe("true");
	rerender(<FimaSuiteTheme enabled={false} />);
	expect(document.documentElement.dataset.fimaSuite).toBeUndefined();
});
