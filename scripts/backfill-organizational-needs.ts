import { config as loadEnv } from "dotenv";
import { backfillIdentifiedChallenges } from "../src/lib/organizational-needs";
import { closeDb } from "../src/lib/db";

loadEnv({ path: ".env.local" });

backfillIdentifiedChallenges()
  .then(({ processed, extracted, skipped }) => {
    console.info(`Historical assistant responses processed: ${processed}`);
    console.info(`Organizational needs extracted and saved: ${extracted}`);
    console.info(`Responses skipped or already represented: ${skipped}`);
  })
  .catch((error: unknown) => {
    console.error("Backfilling organizational needs failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
