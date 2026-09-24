#!/bin/sh
set -eu

target=/downloads/artvis-db.dump
temporary="${target}.part"
expected="${DATASET_MD5}"

checksum() {
  md5sum "$1" | awk '{print $1}'
}

if [ -f "$target" ]; then
  actual="$(checksum "$target")"
  if [ "$actual" = "$expected" ]; then
    echo "Dataset already downloaded and verified: $target"
    exit 0
  fi
  echo "Existing dataset checksum mismatch (expected $expected, got $actual); downloading again." >&2
  rm -f "$target"
fi

rm -f "$temporary"
echo "Downloading artvis-db.dump from ${DATASET_URL}"
if ! wget --tries=3 --timeout=60 -O "$temporary" "$DATASET_URL"; then
  rm -f "$temporary"
  echo "ERROR: Failed to download artvis-db.dump from Zenodo record 22933343." >&2
  echo "Check network access and retry 'docker compose up --build'." >&2
  exit 1
fi

actual="$(checksum "$temporary")"
if [ "$actual" != "$expected" ]; then
  rm -f "$temporary"
  echo "ERROR: artvis-db.dump checksum verification failed." >&2
  echo "Expected MD5: $expected" >&2
  echo "Actual MD5:   $actual" >&2
  exit 1
fi

mv "$temporary" "$target"
echo "Dataset checksum verified: $expected"
