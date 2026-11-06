import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { RetainedView } from "@/components/providers/RetainedView";
import type { ZtcDiaryRow } from "@/flows/ztc-production/lib/ztc-site-diary-utils";

const mockGetZtcRatesDialogData = jest.fn();

jest.mock("@/flows/ztc-production/backend/actions", () => ({
  getZtcRatesDialogData: (...args: unknown[]) => mockGetZtcRatesDialogData(...args),
  updateZtcPayrollFields: jest.fn(),
}));

jest.mock("@/flows/ztc-production/frontend/ZtcDefaultRatesDialog", () => ({
  ZtcDefaultRatesDialog: ({ projectOptions }: { projectOptions: string[] }) => (
    <div data-testid="rate-project-options">{projectOptions.join("|")}</div>
  ),
}));

jest.mock("@/flows/ztc-production/frontend/ZtcRelatedImageGallery", () => ({
  ZtcRelatedImageGallery: () => null,
}));

import { useZtcSiteDiaryFlow } from "@/flows/ztc-production/frontend/useZtcSiteDiaryFlow";

function Harness() {
  const [rows, setRows] = React.useState([
    {
      id: "visible-row",
      Date: "2026-08-07",
      Location: "Projekts pašreizējā lapā",
    },
  ]);
  const flow = useZtcSiteDiaryFlow({
    enabled: true,
    siteId: "ztc-site",
    rows,
    setRows,
    setViewMode: jest.fn(),
    setProjectFilter: jest.fn(),
    setElementFilter: jest.fn(),
  });

  return flow.dialogs;
}

describe("useZtcSiteDiaryFlow rate projects", () => {
  beforeEach(() => {
    mockGetZtcRatesDialogData.mockResolvedValue({
      rates: [],
      projectOptions: ["Projekts ārpus pašreizējās lapas"],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("uses the site-wide project options returned for the rates dialog", async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("rate-project-options")).toHaveTextContent("Projekts ārpus pašreizējās lapas");
    });
    expect(screen.getByTestId("rate-project-options")).not.toHaveTextContent("Projekts pašreizējā lapā");
    expect(mockGetZtcRatesDialogData).toHaveBeenCalledWith("ztc-site");
  });
});

function PayrollHarness() {
  const [rows, setRows] = React.useState<ZtcDiaryRow[]>([{ id: "row", Date: "2026-11-06", Works: "Initial work", Location_Custom_2: "2" }]);
  const flow = useZtcSiteDiaryFlow({
    enabled: true, siteId: "site", rows, setRows, managedRates: true,
    setViewMode: jest.fn(), setProjectFilter: jest.fn(), setElementFilter: jest.fn(),
  });
  return <>
    {flow.renderPayrollInput(rows[0], "rate", rows[0].Location_Custom_2)}
    <output>{flow.payrollDirtyRowIds.has("row") ? "Unsaved" : "Saved"}</output>
    <span>{rows[0].Works}</span>
    <button type="button" onClick={() => flow.applyLoadedRows([{ id: "row", Date: "2026-11-06", Works: "Updated work", Location_Custom_2: "3" }])}>Apply server update</button>
  </>;
}

it("keeps real payroll drafts protected after hiding and returning to a retained project", () => {
  const view = render(<RetainedView active><PayrollHarness /></RetainedView>);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "9" } });
  expect(screen.getByText("Unsaved")).toBeVisible();
  view.rerender(<RetainedView active={false}><PayrollHarness /></RetainedView>);
  view.rerender(<RetainedView active><PayrollHarness /></RetainedView>);
  fireEvent.click(screen.getByText("Apply server update"));
  expect(screen.getByRole("textbox")).toHaveValue("9");
  expect(screen.getByText("Unsaved")).toBeVisible();
  expect(screen.getByText("Updated work")).toBeVisible();
});
