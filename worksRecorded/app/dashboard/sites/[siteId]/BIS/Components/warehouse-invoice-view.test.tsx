import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import * as React from "react"
import type { WarehouseMaterialRow } from "@/lib/bis/warehouse-material-query"
import type { WarehouseInvoiceSummary } from "@/server/actions/warehouse-invoice-view-actions"
import { WarehouseInvoiceView } from "./warehouse-invoice-view"

const invoice: WarehouseInvoiceSummary = {
  key: "batch:one",
  locator: { type: "batch", value: "one" },
  invoiceNumber: "INV-1",
  supplierName: "Supplier",
  invoiceDate: new Date("2026-11-01T00:00:00.000Z"),
  createdAt: new Date("2026-11-02T00:00:00.000Z"),
  sourcePhoto: null,
  itemCount: 2,
  totalCost: 30,
  sentCount: 0,
}

const rows = [
  {
    id: "row-1",
    name: "Cement",
    quantity: 2,
    measurementUnit: "bag",
    materialDate: new Date("2026-11-01T00:00:00.000Z"),
    cost: 10,
    BISId: null,
  },
  {
    id: "row-2",
    name: "Sand",
    quantity: 4,
    measurementUnit: "bag",
    materialDate: new Date("2026-11-01T00:00:00.000Z"),
    cost: 20,
    BISId: null,
  },
] as WarehouseMaterialRow[]

function Harness({
  active,
  fetchInvoices = jest.fn().mockResolvedValue([invoice]),
  fetchInvoiceRows = jest.fn().mockResolvedValue(rows),
}: {
  active: boolean
  fetchInvoices?: jest.Mock
  fetchInvoiceRows?: jest.Mock
}) {
  const [selected, setSelected] = React.useState<string[]>([])
  return (
    <WarehouseInvoiceView
      siteId="site-1"
      language="en"
      query={{}}
      active={active}
      refreshKey={0}
      selectedRowIds={selected}
      onSelectionChange={setSelected}
      fetchInvoices={fetchInvoices}
      fetchInvoiceRows={fetchInvoiceRows}
    />
  )
}

it("retains invoice summaries and rows when the invoice view is reopened", async () => {
  const fetchInvoices = jest.fn().mockResolvedValue([invoice])
  const fetchInvoiceRows = jest.fn().mockResolvedValue(rows)
  const props = {
    siteId: "site-1",
    language: "en" as const,
    query: {},
    refreshKey: 0,
    selectedRowIds: [],
    onSelectionChange: jest.fn(),
    fetchInvoices,
    fetchInvoiceRows,
  }
  const view = render(<WarehouseInvoiceView {...props} active={false} />)
  expect(fetchInvoices).not.toHaveBeenCalled()
  view.rerender(<WarehouseInvoiceView {...props} active />)
  const invoiceButton = (await screen.findByText("INV-1")).closest("button")
  expect(invoiceButton).not.toBeNull()
  fireEvent.click(invoiceButton as HTMLButtonElement)
  await screen.findByText("Cement")
  fireEvent.click(invoiceButton as HTMLButtonElement)
  fireEvent.click(invoiceButton as HTMLButtonElement)
  expect(fetchInvoiceRows).toHaveBeenCalledTimes(1)
  view.rerender(<WarehouseInvoiceView {...props} active={false} />)
  view.rerender(<WarehouseInvoiceView {...props} active />)
  expect(fetchInvoices).toHaveBeenCalledTimes(1)
})

it("selects every movable row from the invoice header", async () => {
  const fetchInvoices = jest.fn().mockResolvedValue([invoice])
  const fetchInvoiceRows = jest.fn().mockResolvedValue(rows)
  render(
    <Harness
      active
      fetchInvoices={fetchInvoices}
      fetchInvoiceRows={fetchInvoiceRows}
    />,
  )
  await screen.findByText("INV-1")
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "Select all movable rows in this invoice: INV-1",
    }),
  )
  const invoiceButton = screen.getByText("INV-1").closest("button")
  fireEvent.click(invoiceButton as HTMLButtonElement)
  await waitFor(() =>
    expect(
      screen.getByRole("checkbox", { name: "Select warehouse row: Cement" }),
    ).toBeChecked(),
  )
  expect(
    screen.getByRole("checkbox", { name: "Select warehouse row: Sand" }),
  ).toBeChecked()
  expect(fetchInvoices).toHaveBeenCalledTimes(1)
  expect(fetchInvoiceRows).toHaveBeenCalledTimes(1)
})
