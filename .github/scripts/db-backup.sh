set -euo pipefail

if [[ "${PGPORT:-}" != "5432" ]]; then
  printf '%s\n' 'Backups require a direct or session connection on port 5432.' >&2
  exit 1
fi

for name in PGHOST PGUSER PGDATABASE PGPASSWORD; do
  if [[ -z "${!name:-}" ]]; then
    printf 'Missing backup setting: %s\n' "$name" >&2
    exit 1
  fi
done

export PGSSLMODE="${PGSSLMODE:-require}"
mkdir -p backups
file="db_$(date -u +'%Y%m%d_%H%M%S').sql"

docker run --rm \
  --env PGPASSWORD --env PGSSLMODE --env PGHOST --env PGPORT \
  --env PGUSER --env PGDATABASE \
  --volume "$PWD/backups:/backups" \
  postgres:17 pg_dump --format=plain --no-owner --no-privileges \
  --file="/backups/$file"

test -s "backups/$file"
ls -lh "backups/$file"
