import { spawn } from 'child_process';
import * as fs from 'fs';

const PG_HOST = "aws-0-eu-north-1.pooler.supabase.com";
const PG_PORT = "5432"; // Use the direct port for dumping!
const PG_USER = "postgres.wfsvrqtzsaqngbrbatfp";
const PG_PASSWORD = "Sapkullen2512!!";
const OUTPUT_FILE = "alldb_dump.sql";

// Spawn pg_dumpall process (note: three arguments!)
const dumpall = spawn(
  'pg_dumpall',
  [
    '-h', PG_HOST,
    '-p', PG_PORT,
    '-U', PG_USER,
  ],
  {
    env: {
      ...process.env,
      PGPASSWORD: PG_PASSWORD
    }
  }
);

const fileStream = fs.createWriteStream(OUTPUT_FILE);

// Pipe stdout of pg_dumpall to the file
dumpall.stdout.pipe(fileStream);

// Optionally, handle stderr for errors
dumpall.stderr.on('data', (data) => {
  console.error(`pg_dumpall error: ${data}`);
});

// Handle finish
dumpall.on('close', (code) => {
  if (code === 0) {
    console.log(`Database dumped successfully to ${OUTPUT_FILE}`);
  } else {
    console.error(`pg_dumpall exited with code ${code}`);
  }
});
