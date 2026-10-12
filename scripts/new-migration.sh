#!/usr/bin/env bash
#
# Author a new Prisma migration for the managed (CloudClusters) database WITHOUT a
# shadow database. The application role has no database level CREATE privilege, so
# `prisma migrate dev` (which provisions a shadow database) cannot run here.
#
# Instead this diffs the live database against prisma/schema.prisma, a read only
# introspection, and writes the resulting SQL to a timestamped migration folder for
# you to review. Apply it afterwards with:
#
#   npm run prisma:deploy
#
# Usage:
#   npm run prisma:migration:new -- <migration_name>
#
set -euo pipefail

name="${1:-}"
if [ -z "${name}" ]; then
  echo "Usage: npm run prisma:migration:new -- <migration_name>" >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "Error: .env not found; it must define DATABASE_URL." >&2
  exit 1
fi

# Read DATABASE_URL from .env without sourcing the file (values may contain spaces).
database_url="$(grep -E '^DATABASE_URL=' .env | head -n1 | cut -d= -f2-)"
if [ -z "${database_url}" ]; then
  echo "Error: DATABASE_URL is not set in .env." >&2
  exit 1
fi

timestamp="$(date -u +%Y%m%d%H%M%S)"
dir="prisma/migrations/${timestamp}_${name}"
file="${dir}/migration.sql"
mkdir -p "${dir}"

# Only the SQL goes to the file; CLI warnings stay on stderr.
npx prisma migrate diff \
  --from-url "${database_url}" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "${file}"

if grep -q 'This is an empty migration' "${file}"; then
  echo "No schema changes detected; the live database already matches the schema."
  rm -rf "${dir}"
  exit 0
fi

echo "Created ${file}"
echo "Review the SQL, then apply it with: npm run prisma:deploy"
