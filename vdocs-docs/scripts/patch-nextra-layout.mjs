import { readFileSync, writeFileSync } from "node:fs";

const file = "node_modules/nextra-theme-docs/dist/schemas.js";
const source = readFileSync(file, "utf8");
const patched = source.replace("children: reactNode,", "children: reactNode.optional(),");

if (patched === source) {
  throw new Error("Unable to patch nextra-theme-docs Layout children schema");
}

writeFileSync(file, patched);
