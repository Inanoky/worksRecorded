import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const {
  PG_HOST = 'aws-0-eu-north-1.pooler.supabase.com',
  PG_PORT = '5432',
  PG_USER = 'postgres.wfsvrqtzsaqngbrbatfp',
  PG_PASSWORD = 'Sapkullen2512!!',
} = process.env;

// Output directory for your backups
const OUTPUT_DIR = 'C:\\Users\\user\\Desktop\\backups';

// Ensure the directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function buildDumpFileName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    '_',
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join('');
  return `alldb_dump_${timestamp}.sql`;
}

function dumpDatabase() {
  const filename = buildDumpFileName();
  const filePath = path.join(OUTPUT_DIR, filename);

  const dumpProcess = spawn(
    'pg_dumpall',
    ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER],
    {
      env: {
        ...process.env,
        PGPASSWORD: PG_PASSWORD,
      },
      // Use shell:true on Windows if pg_dumpall is not in PATH
      // shell: true,
    },
  );

  const fileStream = fs.createWriteStream(filePath);
  dumpProcess.stdout.pipe(fileStream);

  dumpProcess.stderr.on('data', (data) => {
    console.error(`pg_dumpall error: ${data}`);
  });

  dumpProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`Database dumped successfully to ${filePath}`);
    } else {
      console.error(`pg_dumpall exited with code ${code}`);
    }
  });
}

// run immediately
dumpDatabase();
// repeat every 2 hours
const twoHours = 2 * 60 * 60 * 1000;
setInterval(dumpDatabase, twoHours);
