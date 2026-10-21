#!/usr/bin/env bash
# Usage: mutate.sh <file> <test-path> then lines "name|||sed-expression" on stdin. Restores the file after each.
set -u
file=$1; tests=$2
while IFS= read -r line; do
  name=${line%%|||*}; expr=${line#*|||}
  cp "$file" /tmp/mut.bak
  sed -i "$expr" "$file"
  if cmp -s "$file" /tmp/mut.bak; then echo "| $name | NOT APPLIED |"; continue; fi
  out=$(timeout 60 pnpm exec vitest run "$tests" 2>&1); code=$?
  failed=$(echo "$out" | grep -Eo 'Tests +[0-9]+ failed' | grep -Eo '[0-9]+' || true)
  cp /tmp/mut.bak "$file"
  if [ "$code" = "0" ]; then echo "| $name | survived |"
  elif [ -n "$failed" ]; then echo "| $name | caught ($failed tests failed) |"
  else echo "| $name | caught (run failed or hung, exit $code) |"; fi
done
