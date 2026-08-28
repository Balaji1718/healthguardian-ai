import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const publicDir = path.join(rootDir, "public");

if (!fs.existsSync(distDir)) {
  throw new Error("dist directory not found. Run the frontend build first.");
}

for (const entry of fs.readdirSync(publicDir)) {
  const src = path.join(publicDir, entry);
  const dest = path.join(distDir, entry);
  if (fs.existsSync(dest)) continue;
  fs.copyFileSync(src, dest);
}
