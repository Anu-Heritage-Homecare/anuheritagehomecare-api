// Assert the autocannon load test result against the performance budget.
// Usage: node scripts/assert-perf.mjs <autocannon-json-file>
import { readFileSync } from 'node:fs';

const MAX_P99_MS = 200; // 99th percentile latency ceiling
const MIN_RPS = 300; // minimum sustained requests per second

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/assert-perf.mjs <autocannon-json-file>');
  process.exit(2);
}

const result = JSON.parse(readFileSync(file, 'utf8'));
const p99 = result.latency?.p99 ?? Infinity;
const rps = result.requests?.average ?? 0;
const non2xx = result.non2xx ?? 0;
const errors = result.errors ?? 0;

console.log(`p99=${p99}ms  rps=${Math.round(rps)}  non2xx=${non2xx}  errors=${errors}`);

const failures = [];
if (errors > 0) failures.push(`${errors} connection errors`);
if (non2xx > 0) failures.push(`${non2xx} non-2xx responses`);
if (p99 > MAX_P99_MS) failures.push(`p99 ${p99}ms exceeds ${MAX_P99_MS}ms`);
if (rps < MIN_RPS) failures.push(`throughput ${Math.round(rps)} rps below ${MIN_RPS} rps`);

if (failures.length > 0) {
  console.error('Performance gate FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('Performance gate passed.');
