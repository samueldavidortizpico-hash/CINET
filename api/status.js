import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createStatusHandler } from "../server/status.js";

const handler = createStatusHandler(() => readFileSync(resolve(process.cwd(), "dist/index.html"), "utf8"));

export default handler;
