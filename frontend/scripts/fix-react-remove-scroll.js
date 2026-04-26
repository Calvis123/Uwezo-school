const fs = require("node:fs");
const path = require("node:path");

const packageRoot = path.join(process.cwd(), "node_modules", "react-remove-scroll", "dist");
const source = path.join(packageRoot, "es2019", "aggresiveCapture.js");
const target = path.join(packageRoot, "es2015", "aggresiveCapture.js");

if (!fs.existsSync(source)) {
  console.warn("[postinstall] react-remove-scroll source file not found, skipping fix.");
  process.exit(0);
}

if (!fs.existsSync(target)) {
  fs.copyFileSync(source, target);
  console.log("[postinstall] Restored missing react-remove-scroll es2015/aggresiveCapture.js");
}
