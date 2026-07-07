import { cleanZtcWorkName } from "@/flows/ztc-production/lib/ztc-work-name-cleanup";

describe("cleanZtcWorkName", () => {
  it("cleans common Latvian work-name extraction variants", () => {
    expect(cleanZtcWorkName("L2/B2 - Gipškartona plāksne GKF 15 mm")).toBe(
      "L2/B2 - Ģipškartona plāksne GKF 15 mm",
    );
    expect(cleanZtcWorkName("R1/T1 - Gipskartona plāksne GKF 15 mm")).toBe(
      "R1/T1 - Ģipškartona plāksne GKF 15 mm",
    );
    expect(cleanZtcWorkName("TL - Koka karkass 145 mm")).toBe(
      "TL - Koka karkas 145 mm",
    );
    expect(cleanZtcWorkName("L0 - Paroc Ultra mineralvates siltumizolacija 150 mm")).toBe(
      "L0 - Paroc Ultra minerālvates siltumizolācija 150 mm",
    );
  });
});
