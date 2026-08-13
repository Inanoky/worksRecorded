import {
  buildZtcRateSelectOption,
  formatZtcRateOptionLabel,
} from "@/flows/ztc-production/lib/ztc-rate-option";

describe("ZTC rate dropdown options", () => {
  it("shows the rate and a readable unit without changing the saved value", () => {
    expect(
      buildZtcRateSelectOption({
        task: "Minerālvate Knauf Expert",
        rates: [
          {
            task: "Minerālvate Knauf Expert",
            rate: "0.9",
            unit: "m2",
          },
        ],
        category: "works",
      }),
    ).toEqual({
      value: "Minerālvate Knauf Expert",
      label: "Minerālvate Knauf Expert [0,9 €/m²]",
    });
  });

  it("marks a historical drawing name when it resolves to an effective rate", () => {
    const option = buildZtcRateSelectOption({
      task: "L0 - Minerālvate Knauf Expert",
      rates: [
        {
          task: "Minerālvate Knauf Expert",
          rate: "0.9",
          unit: "m2",
        },
      ],
      category: "works",
    });

    expect(option.value).toBe("L0 - Minerālvate Knauf Expert");
    expect(option.label).toBe("L0 - Minerālvate Knauf Expert [0,9 €/m²]");
  });

  it("leaves an unmatched historical work unmarked", () => {
    expect(
      buildZtcRateSelectOption({
        task: "Vēsturisks darbs",
        rates: [],
        category: "works",
      }),
    ).toEqual({
      value: "Vēsturisks darbs",
      label: "Vēsturisks darbs",
    });
  });

  it("formats hour-based rates", () => {
    expect(
      formatZtcRateOptionLabel("Papilddarbs", {
        task: "Papilddarbs",
        rate: "12.50",
        unit: "st",
      }),
    ).toBe("Papilddarbs [12,50 €/st.]");
  });
});
