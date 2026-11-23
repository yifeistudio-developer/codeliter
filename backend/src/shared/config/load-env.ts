import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const backendRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));

config({ path: resolve(backendRoot, ".env.local") });
config({ path: resolve(backendRoot, ".env") });
