# WhatsApp browser diary synchronizer

This worker opens WhatsApp Web with a persistent Playwright browser profile, reads the group `Ikdiena paveiktais un izlietotais mat.`, uploads associated images, and sends signed message batches to the WorksRecorded ingestion endpoint. The server performs project and existing-rate matching, applies the diary calculation rules, deduplicates records, and creates both work-record and site-diary gallery photo references.

## Architecture

1. A small Linux VM keeps the WhatsApp Web session in an encrypted persistent directory.
2. A systemd timer starts the browser worker once per day.
3. The worker sends each source-message cluster to `POST /api/internal/whatsapp-browser-sync` using a shared bearer secret.
4. The application stores an idempotency claim before parsing or writing diary rows. Re-running the worker cannot create the same source cluster twice.
5. A separate health timer verifies that WhatsApp is still authenticated. It fails when a QR code or reconnect action is required.

The worker never sends WhatsApp messages. It only reads the configured group.

## Application configuration

Configure these variables in the WorksRecorded deployment:

```dotenv
WHATSAPP_BROWSER_SYNC_SECRET=<same random secret used by the VM>
WHATSAPP_BROWSER_SYNC_ORGANIZATION_ID=58467603-196e-4661-83ff-fe26e4b0ff0b
WHATSAPP_BROWSER_SYNC_MODEL=gpt-5.6-terra
OPENAI_API_KEY=<server-side OpenAI key>
```

The existing `DATABASE_URL` and UploadThing application configuration are also required. Apply the checked-in Prisma migration through the project's normal reviewed deployment process before starting the worker.

## VM requirements

- Ubuntu 24.04 LTS or 22.04 LTS
- Node.js 20+
- At least 2 vCPU, 4 GB RAM, and 20 GB encrypted disk
- Outbound HTTPS access to WhatsApp Web, WorksRecorded, and UploadThing
- A dedicated unprivileged service account

Clone the repository on the VM, install production dependencies, and install the Playwright browser:

```bash
npm ci
npx playwright install --with-deps chromium
```

Create the state directories and keep them readable only by the service account:

```bash
sudo install -d -o worksrecorded -g worksrecorded -m 0700 /var/lib/worksrecorded-whatsapp/profile
sudo install -d -o worksrecorded -g worksrecorded -m 0700 /var/lib/worksrecorded-whatsapp/failures
sudo install -d -o root -g worksrecorded -m 0750 /etc/worksrecorded
sudo install -o root -g worksrecorded -m 0640 workers/whatsapp-browser-sync/whatsapp-browser-sync.env.example /etc/worksrecorded/whatsapp-browser-sync.env
```

Edit `/etc/worksrecorded/whatsapp-browser-sync.env` and replace every placeholder. The worker needs its own `UPLOADTHING_TOKEN` because media is uploaded directly from the VM.

## First WhatsApp login

The initial login requires a visible browser. Use a temporary SSH-forwarded desktop, noVNC session, or local X display and run:

```bash
sudo -u worksrecorded bash -lc 'set -a; source /etc/worksrecorded/whatsapp-browser-sync.env; set +a; cd /opt/worksrecorded; npm run whatsapp-browser:bootstrap'
```

Scan the QR code with the WhatsApp account that is already a member of the group. Stop the process after the group list appears. The authenticated session remains in `WHATSAPP_BROWSER_DATA_DIR`.

Protect and back up this directory like a password: it contains a live WhatsApp session. Revoke the linked device from WhatsApp immediately if the VM is lost or compromised.

## First synchronization

With `WHATSAPP_BROWSER_IMPORT_AFTER` empty, the first normal run records the currently loaded messages as its checkpoint and does not import them. This is the safest production default.

To intentionally import a known period, set an ISO timestamp such as `2026-09-23T00:00:00+03:00` before the first normal run. Remove the value after the backfill succeeds. The server-side idempotency table remains the final duplicate guard.

Test the login and one run manually:

```bash
sudo -u worksrecorded bash -lc 'set -a; source /etc/worksrecorded/whatsapp-browser-sync.env; set +a; cd /opt/worksrecorded; npm run whatsapp-browser:health'
sudo -u worksrecorded bash -lc 'set -a; source /etc/worksrecorded/whatsapp-browser-sync.env; set +a; cd /opt/worksrecorded; npm run whatsapp-browser:once'
```

Inspect the diary and uploaded gallery images before enabling the timer.

## Scheduling with systemd

Copy the supplied units and adjust `WorkingDirectory`, `User`, and `Group` if required:

```bash
sudo cp workers/whatsapp-browser-sync/systemd/*.service /etc/systemd/system/
sudo cp workers/whatsapp-browser-sync/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now worksrecorded-whatsapp-browser.timer
sudo systemctl enable --now worksrecorded-whatsapp-health.timer
```

The sync timer runs daily at 00:00 in `Europe/Riga`. The health timer checks the session every 15 minutes.

Verify operation with:

```bash
systemctl list-timers 'worksrecorded-whatsapp-*'
journalctl -u worksrecorded-whatsapp-browser.service -n 100 --no-pager
journalctl -u worksrecorded-whatsapp-health.service -n 100 --no-pager
```

Failure screenshots are saved under `WHATSAPP_BROWSER_FAILURE_DIR`. Connect the health service failure state to the VM provider's monitoring or a systemd `OnFailure=` notification unit so a QR-login failure produces an alert.

## Operational controls

Pause all automated imports without deleting state:

```bash
sudo systemctl disable --now worksrecorded-whatsapp-browser.timer
```

Run a single retry with `npm run whatsapp-browser:once`. Successful source clusters are safe to retry because their idempotency keys are persisted in the application database.

WhatsApp Web automation is less stable than an official API and may need selector maintenance after a WhatsApp UI update. Use it only with an account and workflow whose WhatsApp terms and organizational privacy requirements permit this automation.
