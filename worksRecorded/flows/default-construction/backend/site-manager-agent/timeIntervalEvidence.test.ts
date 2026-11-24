import { readClockIntervalEvidence } from "./timeIntervalEvidence";

it.each([
  ["No pulksten diviem līdz pulksten trijiem braucu pēc materiāliem.", 1],
  ["No pulksten vieniem līdz pulksten diviem.", 1],
  ["No pulksten diviem līdz trim.", 1],
  ["No pulksten vienpadsmitiem līdz divpadsmitiem.", 1],
  ["No pulksten divdesmit vieniem līdz divdesmit diviem.", 1],
  ["NO PULKSTEN DIVIEM LĪDZ PULKSTEN TRĪS.", 1],
  ["No plkst. 14:00 līdz plkst. 15:00 braucu pēc materiāliem.", 1],
  ["Brauciens 14:00–15:00.", 1],
  ["No plkst. 14.30 līdz 15.30.", 1],
  ["Pulksten 14.15–15.45.", 1.5],
  ["No plkst. 14:00 līdz 14:45.", 0.75],
  ["No plkst. 14:00 līdz 14:20.", 0.3333],
])(
  "derives elapsed hours only from a complete clock interval: %s",
  (source, hours) => {
    expect(readClockIntervalEvidence(source).intervalHours).toEqual([hours]);
  },
);

it.each([
  "No pulksten vieniem braucu pēc materiāliem.",
  "Līdz pulksten diviem.",
  "No plkst. 1:00.",
  "No diviem līdz trijiem strādniekiem.",
  "No 1 līdz 2 stāviem.",
  "Pozīcijas 1.10–2.10.",
  "No plkst. 25:00 līdz 26:00.",
  "No plkst. 1:99 līdz 2:99.",
  "No plkst. 1:00 līdz 1:00.",
  "No plkst. 23:00 līdz 0:00.",
  "No 114:00 līdz 115:00.",
  "No plkst. 14:0 līdz 15:0.",
  "No pulksten pusdiviem līdz pustrijiem.",
])(
  "does not infer hours from an incomplete, ambiguous or invalid interval: %s",
  (source) => {
    expect(readClockIntervalEvidence(source).intervalHours).toEqual([]);
  },
);

it("keeps distinct intervals separate without adding their durations", () => {
  expect(
    readClockIntervalEvidence("Braucu 3:00–4:00, izkrāvu 5:00–6:00.")
      .intervalHours,
  ).toEqual([1, 1]);
});

it("keeps an independent explicit duration after removing clock references", () => {
  const { durationSource } = readClockIntervalEvidence(
    "No plkst. 1:00 līdz 3:00 strādāju. Papildu darbs 1 stundu.",
  );
  expect(durationSource).toContain("Papildu darbs 1 stundu.");
  expect(durationSource).not.toContain("1:00");
  expect(durationSource).not.toContain("3:00");
});
