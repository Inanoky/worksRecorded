import { render, screen, waitFor } from "@testing-library/react";
import * as React from "react";

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
