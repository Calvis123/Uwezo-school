const fs = require("node:fs");
const path = require("node:path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyDir(from, to) {
  ensureDir(path.dirname(to));
  fs.cpSync(from, to, { recursive: true, force: true });
}

function main() {
  const projectRoot = process.cwd();
  const nextDir = path.join(projectRoot, ".next");
  const standaloneRoot = path.join(nextDir, "standalone");

  const staticFrom = path.join(nextDir, "static");
  const staticTo = path.join(standaloneRoot, ".next", "static");
  const publicFrom = path.join(projectRoot, "public");
  const publicTo = path.join(standaloneRoot, "public");

  if (!fs.existsSync(standaloneRoot)) {
    throw new Error(`Missing ${standaloneRoot}. Run next build first.`);
  }
  if (fs.existsSync(staticFrom)) copyDir(staticFrom, staticTo);
  if (fs.existsSync(publicFrom)) copyDir(publicFrom, publicTo);
}

main();

