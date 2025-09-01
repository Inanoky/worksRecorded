import * as fs from "fs";
import * as path from "path";
import { validateExcel } from "@/app/utils/SiteDiary/Settings/validateSchema";


// This test is testing this code :
// C:\Users\user\MVP\Buvconsult-deploy\buvconsult\app\utils\SiteDiary\Settings\validateSchema.ts
// for schemas to be valid WBS, has all 3 columns filled. 


const TEST_DIR = path.join(__dirname, "testSchemas");

describe("Excel Schema Validation (real files)", () => {
  const files = fs.readdirSync(TEST_DIR).filter((f) => f.endsWith(".xlsx"));

  if (files.length === 0) {
    console.warn("⚠️ No test schema files found in:", TEST_DIR);
  }

  files.forEach((file) => {
    // Expected result comes from filename
    const shouldPass = file.toUpperCase().includes("TRUE");
    const shouldFail = file.toUpperCase().includes("FALSE");

    if (!shouldPass && !shouldFail) {
      throw new Error(
        `Test file "${file}" must include either 'TRUE' or 'FALSE' in its name`
      );
    }

    it(`validates schema file: ${file} (expected ${shouldPass ? "PASS" : "FAIL"})`, () => {
      const filePath = path.join(TEST_DIR, file);
      const buffer = fs.readFileSync(filePath);

      let passed = false;
      try {
        validateExcel(buffer);
        passed = true;
      } catch (err) {
        console.log(`❌ ${file} failed with error:`, (err as Error).message);
      }

      if (shouldPass) {
        expect(passed).toBe(true); // must pass
      } else {
        expect(passed).toBe(false); // must fail
      }
    });
  });
});
