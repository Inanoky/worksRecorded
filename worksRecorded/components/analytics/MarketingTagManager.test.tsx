import { render, screen } from "@testing-library/react";
import { MarketingTagManager } from "./MarketingTagManager";

const usePathnameMock = jest.fn();

jest.mock("next/navigation", () => ({
	usePathname: () => usePathnameMock(),
}));

jest.mock("@next/third-parties/google", () => ({
	GoogleAnalytics: ({ gaId }: { gaId: string }) => (
		<div data-testid="google-analytics">{gaId}</div>
	),
	GoogleTagManager: ({ gtmId }: { gtmId: string }) => (
		<div data-testid="google-tag-manager">{gtmId}</div>
	),
}));

describe("MarketingTagManager", () => {
	it("loads the marketing container on landing pages", () => {
		usePathnameMock.mockReturnValue("/lv/Landing");

		render(<MarketingTagManager gaId="G-TEST" gtmId="GTM-TEST" />);

		expect(screen.getByTestId("google-tag-manager")).toHaveTextContent(
			"GTM-TEST",
		);
		expect(screen.queryByTestId("google-analytics")).not.toBeInTheDocument();
	});

	it("loads GA only on authenticated application pages", () => {
		usePathnameMock.mockReturnValue("/dashboard");

		render(<MarketingTagManager gaId="G-TEST" gtmId="GTM-TEST" />);

		expect(screen.getByTestId("google-analytics")).toHaveTextContent("G-TEST");
		expect(screen.queryByTestId("google-tag-manager")).not.toBeInTheDocument();
	});
});
