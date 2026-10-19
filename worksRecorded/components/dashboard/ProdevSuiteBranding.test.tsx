import { render, screen } from "@testing-library/react";
import { ProdevSuiteLogo } from "./ProdevSuiteLogo";
import { ProdevSuiteTheme } from "./ProdevSuiteTheme";

it("uses the official local ProDev logo and the business suite label", () => {
	render(<ProdevSuiteLogo />);
	const logo = screen.getByAltText("PRO DEV");
	expect(logo.getAttribute("src")).toContain("prodev.png");
	expect(logo).toHaveAttribute("width", "465");
	expect(logo).toHaveAttribute("height", "100");
	expect(screen.getByText("business suite")).toBeInTheDocument();
	expect(screen.queryByAltText("FIMA")).not.toBeInTheDocument();
});

it("scopes colours to ProDev and removes the portal theme on organization changes", () => {
	const { rerender, unmount } = render(<ProdevSuiteTheme enabled={false} />);
	expect(document.documentElement.dataset.prodevSuite).toBeUndefined();
	rerender(<ProdevSuiteTheme enabled />);
	expect(document.documentElement.dataset.prodevSuite).toBe("true");
	expect(document.documentElement.dataset.fimaSuite).toBeUndefined();
	rerender(<ProdevSuiteTheme enabled={false} />);
	expect(document.documentElement.dataset.prodevSuite).toBeUndefined();
	rerender(<ProdevSuiteTheme enabled />);
	unmount();
	expect(document.documentElement.dataset.prodevSuite).toBeUndefined();
});
