import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Dead code ratchet.
 *
 * M0.4 removed 24 unreachable files. This keeps them from coming back: it walks
 * the real import graph from main.tsx and fails when a .ts/.tsx/.json file under
 * client/src is reachable from nothing.
 *
 * Vendored shadcn/ui components are exempt — they are a library surface kept on
 * purpose, and several are wanted for the M2/M3 interface work.
 */

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../client/src');
const ENTRY = path.join(ROOT, 'main.tsx');
const EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '.css'];

/** Reachable only via components/ui, which is exempt. */
const EXEMPT = [/^components\/ui\//, /^hooks\/use-mobile\.tsx$/];

function resolveImport(spec: string, fromFile: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // bare package specifier

  for (const ext of EXTS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  for (const ext of EXTS.filter(Boolean)) {
    const candidate = path.join(base, 'index' + ext);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const IMPORT_PATTERNS = [
  /(?:^|\n)\s*import\s[^;]*?from\s*['"]([^'"]+)['"]/g, // import x from '…'
  /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,             // import '…'
  /(?:^|\n)\s*export\s[^;]*?from\s*['"]([^'"]+)['"]/g, // export … from '…'
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,            // dynamic import('…')
];

function reachableFrom(entry: string): Set<string> {
  const seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    if (!/\.(ts|tsx|js|jsx)$/.test(file)) return;

    const src = fs.readFileSync(file, 'utf8');
    for (const pattern of IMPORT_PATTERNS) {
      for (const match of src.matchAll(pattern)) {
        const spec = match[1];
        if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
        const target = resolveImport(spec, file);
        if (target) visit(target);
      }
    }
  };
  visit(entry);
  return seen;
}

function allSourceFiles(): string[] {
  const found: string[] = [];
  const scan = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (/\.(ts|tsx|json)$/.test(entry.name)) found.push(full);
    }
  };
  scan(ROOT);
  return found;
}

test('every file under client/src is reachable from main.tsx', async () => {
  const reachable = reachableFrom(ENTRY);

  const orphans = allSourceFiles()
    .filter((file) => !reachable.has(file))
    .map((file) => path.relative(ROOT, file).split(path.sep).join('/'))
    .filter((rel) => !EXEMPT.some((pattern) => pattern.test(rel)))
    .sort();

  expect(
    orphans,
    'these files are imported by nothing — delete them, or wire them up'
  ).toEqual([]);
});
