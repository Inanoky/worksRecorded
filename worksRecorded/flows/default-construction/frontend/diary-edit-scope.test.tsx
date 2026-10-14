import { render, screen } from "@testing-library/react";
import { getFlowFrontendModule } from "@/components/client-flows/flow-frontend-registry";
import { DefaultSiteDiaryFlow } from "./DefaultSiteDiaryFlow";

jest.mock("next/dynamic", () => ({
	__esModule: true,
	default: () => (props: { batchEditing?: boolean }) => (
		<output data-batch={String(props.batchEditing)}>Flow diary</output>
	),
}));
jest.mock("@/components/sitediary/Calendar", () => ({
	__esModule: true,
	default: (props: { batchEditing?: boolean }) => (
		<output data-batch={String(props.batchEditing)}>Calendar</output>
	),
}));

it.each([
	"default-construction",
	"fima",
	"sprinkler-attendance",
	"ztc-production",
	"default-production",
])("enables batch editing only for Default Construction: %s", (flow) => {
	const Diary = getFlowFrontendModule(flow).SiteDiary;
	render(<Diary siteId="site" />);
	expect(screen.getByRole("status")).toHaveAttribute(
		"data-batch",
		flow === "default-construction" ? "true" : "undefined",
	);
});

it("does not enable batch saves when the construction calendar is reused by another flow", () => {
	render(<DefaultSiteDiaryFlow siteId="site" />);
	expect(screen.getByRole("status")).toHaveAttribute("data-batch", "false");
});
