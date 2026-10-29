import { readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve("dist");

try {
  const entries = await readdir(output);
  await Promise.all(
    entries
      .filter((name) => name !== ".vscode")
      .map((name) =>
        rm(resolve(output, name), { recursive: true, force: true }),
      ),
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
