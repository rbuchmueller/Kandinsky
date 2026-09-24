#!/bin/bash
set -euo pipefail

dump=/downloads/artvis-db.dump
marker=/data/.kandinsky-dataset-md5

if [[ -f "$marker" ]] && [[ "$(cat "$marker")" == "$DATASET_MD5" ]] && [[ -d /data/databases/neo4j ]]; then
  echo "Neo4j data volume already contains the verified dataset; skipping import."
  exit 0
fi

if [[ ! -f "$dump" ]]; then
  echo "ERROR: Verified dataset dump is missing at $dump." >&2
  exit 1
fi

echo "Importing the verified dataset into Neo4j 4.4.5..."
rm -rf /data/databases/neo4j /data/transactions/neo4j
neo4j-admin load --database=neo4j --from="$dump" --force
printf '%s\n' "$DATASET_MD5" > "$marker"
echo "Neo4j import completed. The data is stored in the persistent neo4j-data volume."
