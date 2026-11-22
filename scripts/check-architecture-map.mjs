#!/usr/bin/env node
/**
 * Check the generated architecture map against its own output contract.
 *
 * Usage:
 *   node scripts/check-architecture-map.mjs [file] [--no-mermaid]
 *   node scripts/check-architecture-map.mjs --mermaid-dir <dir>
 *
 * The map is a disposable working artifact (docs/architecture-reviews/ is
 * gitignored), so this is the definition of done for the architecture-map
 * command, not a CI job. Exit 0 means every mechanical check passed.
 */

import { readFileSync, readdirSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_FILE = "docs/architecture-reviews/architecture-map.html";
const args = process.argv.slice(2);
const dirIndex = args.indexOf("--mermaid-dir");
const diagramDir = dirIndex === -1 ? null : args[dirIndex + 1];
const fileArg =
  args.find((arg, index) => !arg.startsWith("--") && (dirIndex === -1 || index !== dirIndex + 1)) ??
  DEFAULT_FILE;
const file = resolve(ROOT, fileArg);
const skipMermaid = args.includes("--no-mermaid");

if (dirIndex !== -1 && !diagramDir) {
  console.error("--mermaid-dir needs a directory");
  process.exit(2);
}

const errors = [];
const notes = [];
const fail = (message) => errors.push(message);
const text = (element) => (element?.textContent ?? "").replace(/\s+/g, " ").trim();
const int = (value) => Number.parseInt(String(value).replace(/[^\d]/g, ""), 10);
const displayPath = (value) => {
  const rel = relative(ROOT, value);
  return rel.startsWith("..") ? value : rel;
};

function report() {
  for (const note of notes) console.log(`INFO ${note}`);
  for (const error of errors) console.error(`FAIL ${error}`);
  if (errors.length > 0) {
    console.error(`\n${errors.length} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll architecture-map checks passed.");
}

async function parseMermaidSources(sources) {
  const blank = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
  const assign = (name, value) => {
    try {
      globalThis[name] = value;
    } catch {
      Object.defineProperty(globalThis, name, { value, configurable: true });
    }
  };
  assign("window", blank.window);
  for (const name of [
    "document",
    "DOMParser",
    "SVGElement",
    "HTMLElement",
    "Element",
    "Node",
    "MutationObserver",
  ]) {
    assign(name, blank.window[name]);
  }
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({ startOnLoad: false, logLevel: "fatal" });
  for (const [index, { label, source }] of sources.entries()) {
    if (!source.trim()) {
      fail(`mermaid: ${label} is empty`);
      continue;
    }
    try {
      await mermaid.parse(source);
    } catch (error) {
      const message = String(error?.message ?? error)
        .split("\n")
        .slice(0, 4)
        .join(" | ");
      fail(`mermaid: ${label} (${source.trim().split("\n")[0]}): ${message}`);
    }
  }
}

if (diagramDir) {
  const directory = resolve(ROOT, diagramDir);
  let files;
  try {
    files = readdirSync(directory)
      .filter((name) => name.endsWith(".mmd"))
      .sort();
  } catch (error) {
    console.error(`Cannot read ${displayPath(directory)}: ${error.message}`);
    process.exit(2);
  }
  if (files.length === 0) fail(`mermaid: no .mmd files in ${displayPath(directory)}`);
  if (!skipMermaid) {
    notes.push(`mermaid: ${files.length} file(s) from ${displayPath(directory)}`);
    await parseMermaidSources(
      files.map((name) => ({
        label: name,
        source: readFileSync(join(directory, name), "utf8"),
      })),
    );
  } else {
    notes.push(`mermaid: skipped ${files.length} file(s) (--no-mermaid)`);
  }
  report();
  process.exit(0);
}

const TIERS = new Set(["S1", "S2", "S3", "S4"]);
const TIER_RANK = { S1: 1, S2: 2, S3: 3, S4: 4 };
const LAYERS = new Set(["Implementation", "Behavioral", "Integration"]);
const RECOVERIES = new Set([
  "retry",
  "restart",
  "fix code",
  "manual SQL",
  "re-export from a backup",
  "nothing",
]);
// The architecture-map command's dossier table is the contract; update this if ownership moves.
const WEIGHTS = {
  database: "Full",
  designs: "Full",
  history: "Full",
  images: "Full",
  library: "Standard",
  materials: "Standard",
  taxonomy: "Standard",
  settings: "Card",
};
const SECTION_IDS = [
  "quick-reference",
  "routes",
  "modules",
  "dossiers",
  "state",
  "loops",
  "components",
  "data",
  "tests",
  "atlas",
];

let html;
try {
  html = readFileSync(file, "utf8");
} catch (error) {
  console.error(`Cannot read ${displayPath(file)}: ${error.message}`);
  process.exit(2);
}

const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => fail(`HTML parse: ${error.message}`));
const dom = new JSDOM(html, { virtualConsole });
const doc = dom.window.document;

const tableHeaders = (table) => [...table.querySelectorAll("thead th")].map(text);
const tableRows = (table) =>
  [...table.querySelectorAll("tbody tr")].map((row) => [...row.children].map(text));
const findTable = (headers) =>
  [...doc.querySelectorAll("table")].find((table) => {
    const found = tableHeaders(table);
    return (
      found.length === headers.length && headers.every((header, index) => found[index] === header)
    );
  });

const featureDirs = readdirSync(join(ROOT, "src/features"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

function walkTests(directory, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walkTests(path, output);
    else if (/\.test\.[^.]+$/.test(entry.name)) output.push(path);
  }
  return output;
}

const testFiles = walkTests(join(ROOT, "src/features"))
  .map((path) => relative(join(ROOT, "src/features"), path).replace(/\\/g, "/"))
  .sort();
const testFileSet = new Set(testFiles);
const testBasenames = new Set(testFiles.map((path) => basename(path)));
const declarationCount = (path) =>
  (readFileSync(join(ROOT, "src/features", path), "utf8").match(/^\s*(?:test|it)\(/gm) ?? [])
    .length;

/* ---------------------------------------------------------------- structure */

const sections = [...doc.querySelectorAll("main > section")];
const sectionIds = sections.map((section) => section.id);
if (
  sectionIds.length !== SECTION_IDS.length ||
  sectionIds.some((id, index) => id !== SECTION_IDS[index])
) {
  fail(`sections: expected ${SECTION_IDS.join(", ")}; found ${sectionIds.join(", ") || "none"}`);
}

for (const section of sections) {
  const label = section.getAttribute("aria-labelledby");
  if (label && !doc.getElementById(label))
    fail(`section #${section.id}: aria-labelledby #${label} is missing`);
}

const ids = [...doc.querySelectorAll("[id]")].map((element) => element.id);
const seenIds = new Set();
for (const id of ids) {
  if (seenIds.has(id)) fail(`duplicate id #${id}`);
  seenIds.add(id);
}

for (const link of doc.querySelectorAll('a[href^="#"]')) {
  const href = link.getAttribute("href");
  if (!href || href === "#") continue;
  const target = decodeURIComponent(href.slice(1));
  if (!doc.getElementById(target)) fail(`anchor ${href} has no target`);
}

for (const element of doc.querySelectorAll("[aria-labelledby], [aria-describedby]")) {
  for (const attribute of ["aria-labelledby", "aria-describedby"]) {
    for (const id of (element.getAttribute(attribute) ?? "").split(/\s+/).filter(Boolean)) {
      if (!doc.getElementById(id)) fail(`${attribute} #${id} has no target`);
    }
  }
}

for (const tag of [
  "section",
  "article",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "pre",
  "div",
  "p",
  "ul",
  "ol",
  "li",
]) {
  const open = (html.match(new RegExp(`<${tag}(?=[\\s>])`, "g")) ?? []).length;
  const close = (html.match(new RegExp(`</${tag}>`, "g")) ?? []).length;
  if (open !== close) fail(`unbalanced <${tag}>: ${open} open, ${close} close`);
}

/* ------------------------------------------------------------- quick reference */

const quickReference = findTable([
  "Feature",
  "Headline severity",
  "First file to open",
  "Top pattern",
  "Public entry",
  "Dossier",
]);
const headlineByFeature = new Map();
if (!quickReference) {
  fail("quick reference: table with the six feature columns is missing");
} else {
  const rows = [...quickReference.querySelectorAll("tbody tr")];
  if (rows.length !== featureDirs.length) {
    fail(`quick reference: ${rows.length} rows for ${featureDirs.length} features`);
  }
  for (const row of rows) {
    const cells = [...row.children].map(text);
    const feature = cells[0];
    const tier = cells[1].match(/^S[1-4]/)?.[0];
    const link = row.querySelector('a[href^="#dossier-"]');
    if (!featureDirs.includes(feature)) fail(`quick reference: unknown feature ${feature}`);
    if (!tier || !TIERS.has(tier)) fail(`quick reference: ${feature} has no S1-S4 headline`);
    if (!link) fail(`quick reference: ${feature} has no dossier link`);
    else if (link.getAttribute("href") !== `#dossier-${feature}`) {
      fail(`quick reference: ${feature} links to ${link.getAttribute("href")}`);
    }
    headlineByFeature.set(feature, tier);
  }
}

/* ----------------------------------------------------------------- dossiers */

const articles = [...doc.querySelectorAll("#dossiers article.dossier")];
const dossierFeatures = articles.map((article) => article.id.replace(/^dossier-/, "")).sort();
if (
  articles.length !== featureDirs.length ||
  dossierFeatures.some((feature, index) => feature !== featureDirs[index])
) {
  fail(
    `dossiers: expected ${featureDirs.join(", ")}; found ${dossierFeatures.join(", ") || "none"}`,
  );
}

let s1Count = 0;
const unprotectedS1 = [];
for (const article of articles) {
  const feature = article.id.replace(/^dossier-/, "");
  const title = text(article.querySelector("h3"));
  if (title !== feature) fail(`dossier ${feature}: heading is ${title || "missing"}`);

  const header = article.querySelector("h3")?.parentElement;
  const headerSpans = header ? [...header.querySelectorAll("span")].map(text) : [];
  const weight = headerSpans.find((value) => ["Full", "Standard", "Card"].includes(value));
  const headline = headerSpans.find((value) => /^S[1-4]/.test(value))?.match(/^S[1-4]/)?.[0];
  if (weight !== WEIGHTS[feature])
    fail(`dossier ${feature}: weight ${weight ?? "missing"} (expected ${WEIGHTS[feature]})`);
  if (headline !== headlineByFeature.get(feature)) {
    fail(
      `dossier ${feature}: headline ${headline ?? "missing"} disagrees with quick reference ${headlineByFeature.get(feature) ?? "missing"}`,
    );
  }

  const headings = [...article.querySelectorAll("h4")].map(text);
  for (const required of ["Tests", "Severity"]) {
    if (!headings.includes(required)) fail(`dossier ${feature}: missing h4 ${required}`);
  }
  if (weight === "Full" || weight === "Standard") {
    for (const required of ["Patterns", "Connections by behaviour"]) {
      if (!headings.includes(required)) fail(`dossier ${feature}: missing h4 ${required}`);
    }
  } else if (!/Connections?\b/.test(text(article))) {
    fail(`dossier ${feature}: missing connection`);
  }
  if (!text(article).includes("First file to open:"))
    fail(`dossier ${feature}: missing First file to open`);

  const severity = [...article.querySelectorAll("table")].find((table) => {
    const headers = tableHeaders(table);
    return headers.includes("Failure mode") && headers.includes("Tier");
  });
  if (!severity) {
    fail(`dossier ${feature}: severity table missing`);
    continue;
  }

  const rows = tableRows(severity);
  if (rows.length === 0) fail(`dossier ${feature}: severity table has no rows`);
  const tiers = [];
  for (const [index, row] of rows.entries()) {
    if (row.length < 5) {
      fail(`dossier ${feature}: severity row ${index + 1} has ${row.length} cells`);
      continue;
    }
    const [, tier, , recovered, detected] = row;
    tiers.push(tier);
    if (!TIERS.has(tier))
      fail(`dossier ${feature}: severity row ${index + 1} tier ${tier || "empty"}`);
    if (!RECOVERIES.has(recovered))
      fail(`dossier ${feature}: severity row ${index + 1} recovery "${recovered}"`);
    if (!detected) fail(`dossier ${feature}: severity row ${index + 1} has no Detected by`);
    if (tier === "S1") {
      s1Count += 1;
      if (/^unprotected$/i.test(detected)) unprotectedS1.push(feature);
    }
    for (const name of detected.split(/\s*(?:,|and)\s*/).filter(Boolean)) {
      if (/^unprotected$/i.test(name)) continue;
      const clean = name.replace(/^src\/features\//, "").trim();
      if (!testFileSet.has(clean) && !testBasenames.has(basename(clean))) {
        fail(`dossier ${feature}: Detected by "${name}" is not a test file`);
      }
    }
  }
  const worst = tiers
    .filter((tier) => TIERS.has(tier))
    .sort((a, b) => TIER_RANK[a] - TIER_RANK[b])[0];
  if (worst !== headline)
    fail(`dossier ${feature}: headline ${headline} is not the worst row ${worst}`);
}

/* -------------------------------------------------------------------- tests */

const testTable = findTable(["File", "Layer", "Cases", "Pins", "Real DB", "Renders"]);
if (!testTable) {
  fail("tests: per-file table is missing");
} else {
  const listed = new Map();
  const totals = { Implementation: 0, Behavioral: 0, Integration: 0 };
  for (const row of [...testTable.querySelectorAll("tbody tr")]) {
    const cells = [...row.children].map(text);
    if (cells.length !== 6) {
      fail(`tests: row for ${cells[0] || "unknown"} has ${cells.length} cells`);
      continue;
    }
    const [rawPath, layer, rawCases, , realDb, renders] = cells;
    const path = rawPath.replace(/^src\/features\//, "");
    if (!testFileSet.has(path)) fail(`tests: unknown file ${path}`);
    if (!LAYERS.has(layer)) fail(`tests: ${path} has layer ${layer}`);
    if (!["yes", "no"].includes(realDb)) fail(`tests: ${path} Real DB is ${realDb}`);
    if (!["yes", "no"].includes(renders)) fail(`tests: ${path} Renders is ${renders}`);
    const cases = int(rawCases);
    if (!Number.isInteger(cases)) fail(`tests: ${path} has non-numeric cases "${rawCases}"`);
    else {
      totals[layer] = (totals[layer] ?? 0) + cases;
      const actual = declarationCount(path);
      if (cases !== actual)
        fail(`tests: ${path} says ${cases} cases; source has ${actual} declarations`);
    }
    if (listed.has(path)) fail(`tests: ${path} appears twice`);
    listed.set(path, cases);
  }
  for (const path of testFiles) if (!listed.has(path)) fail(`tests: missing row for ${path}`);
  for (const path of listed.keys())
    if (!testFileSet.has(path)) fail(`tests: unexpected row for ${path}`);

  for (const [layer, expected] of Object.entries(totals)) {
    const card = [...doc.querySelectorAll("h3")].find((heading) =>
      text(heading).startsWith(`${layer} ·`),
    );
    if (!card) fail(`tests: ${layer} summary card is missing`);
    else if (int(text(card)) !== expected)
      fail(`tests: ${layer} card says ${int(text(card))}; table has ${expected}`);
  }

  const declared = [...listed.values()].reduce((sum, value) => sum + value, 0);
  const snapshot = ` ${testFiles.length} files, ${declared} declarations`;
  if (!text(doc.body).includes(snapshot.trim())) {
    fail(`tests: header does not state "${snapshot.trim()}"`);
  }

  const rollup = findTable([
    "Feature",
    "Files",
    "Integration",
    "Behavioral",
    "Implementation",
    "What its suites protect",
    "Gap",
  ]);
  if (!rollup) fail("tests: per-feature rollup is missing");
  else {
    const totalRow = [...rollup.querySelectorAll("tbody tr")].find(
      (row) => text(row.children[0]) === "Total",
    );
    if (!totalRow) fail("tests: rollup has no Total row");
    else {
      const cells = [...totalRow.children].map(text);
      if (int(cells[1]) !== testFiles.length)
        fail(`tests: rollup files ${cells[1]} != ${testFiles.length}`);
      if (int(cells[2]) !== totals.Integration)
        fail(`tests: rollup Integration ${cells[2]} != ${totals.Integration}`);
      if (int(cells[3]) !== totals.Behavioral)
        fail(`tests: rollup Behavioral ${cells[3]} != ${totals.Behavioral}`);
      if (int(cells[4]) !== totals.Implementation)
        fail(`tests: rollup Implementation ${cells[4]} != ${totals.Implementation}`);
    }
  }
}

/* ------------------------------------------------------------------- triage */

const symptomTable = findTable([
  "Symptom",
  "Suspect (tier)",
  "First file",
  "Confirming test",
  "Next file",
]);
if (!symptomTable) fail("triage: symptom table is missing");
else {
  for (const [index, row] of tableRows(symptomTable).entries()) {
    if (!/S[1-4]/.test(row[1] ?? "")) fail(`triage: row ${index + 1} has no tier`);
  }
}

/* ------------------------------------------------------------------ diagrams */

const sectionDiagrams = (id) => [...doc.querySelectorAll(`#${id} pre.mermaid`)].map(text);
if (!sectionDiagrams("data").some((source) => source.startsWith("erDiagram"))) {
  fail("data: section has no erDiagram");
}
if (!sectionDiagrams("state").some((source) => source.startsWith("stateDiagram-v2"))) {
  fail("state: section has no stateDiagram-v2");
}
if (!sectionDiagrams("loops").some((source) => source.startsWith("sequenceDiagram"))) {
  fail("loops: section has no sequenceDiagram");
}
if (sectionDiagrams("modules").length === 0) fail("modules: section has no diagram");
if (sectionDiagrams("components").length === 0) fail("components: section has no diagram");

/* ------------------------------------------------------------------ hygiene */

if (/(?:^|[^A-Za-z0-9._-])\/(?:home|Users)\/[A-Za-z0-9._-]+/.test(html)) {
  fail("hygiene: absolute home path");
}
if (/<img\b/i.test(html)) fail("hygiene: <img> is not allowed; diagrams must be Mermaid");
if (/url\(\s*['"]?https?:\/\//i.test(html)) fail("hygiene: external CSS image");
const rawAmpersands = html.match(/&(?!#\d+;|#x[0-9a-fA-F]+;|[A-Za-z][A-Za-z0-9]+;)/g);
if (rawAmpersands) fail(`hygiene: ${rawAmpersands.length} raw ampersand(s)`);
if (!html.includes("cdn.tailwindcss.com")) fail("hygiene: Tailwind CDN is missing");
if (!/mermaid@11/.test(html)) fail("hygiene: Mermaid 11 CDN import is missing");
if (!/main table\s*\{/.test(html)) fail("style: main table rules are missing");
if (!/main code\s*\{/.test(html)) fail("style: main code rules are missing");
const repeatedCells = (html.match(/border-t px-3 py-2 align-top/g) ?? []).length;
if (repeatedCells > 20) fail(`style: ${repeatedCells} cells still repeat the full utility string`);
if (html.length > 175 * 1024)
  fail(`style: ${Math.round(html.length / 1024)} KB exceeds the 170 KB budget`);

/* ------------------------------------------------------------------ mermaid */

const blocks = [...doc.querySelectorAll("pre.mermaid")];
if (blocks.length === 0) fail('mermaid: no <pre class="mermaid"> blocks');
else if (!skipMermaid) {
  await parseMermaidSources(
    blocks.map((block, index) => ({
      label: `block ${index + 1}`,
      source: block.textContent,
    })),
  );
} else {
  notes.push(`mermaid: skipped ${blocks.length} blocks (--no-mermaid)`);
}

/* ------------------------------------------------------------------- report */

notes.unshift(
  `${displayPath(file)}: ${Math.round(html.length / 1024)} KB, ${sections.length} sections, ${blocks.length} Mermaid blocks`,
);
notes.unshift(
  `tests: ${testFiles.length} files, ${testFiles.reduce((sum, path) => sum + declarationCount(path), 0)} declarations`,
);
notes.unshift(
  `dossiers: ${articles.length}; S1 rows: ${s1Count}; unprotected S1: ${unprotectedS1.length ? unprotectedS1.join(", ") : "none"}`,
);

report();
