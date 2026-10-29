// Zips the built extension for manual install (and later, Chrome Web Store upload).
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";

const source = resolve("extension");
const output = resolve("dist/extension/cobwebs-extension.zip");
// Bundled into dist/content.js; not loaded by the extension itself.
const skip = new Set(["src/content.js"]);

async function files(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) out.push(...(await files(path)));
    else out.push(path);
  }
  return out;
}

try {
  await stat(join(source, "dist/content.js"));
} catch {
  throw new Error("Run `npm run build:extension` before packing.");
}

const { version } = JSON.parse(
  await readFile(join(source, "manifest.json"), "utf8"),
);
const local = [],
  central = [];
let offset = 0;
for (const path of (await files(source)).sort()) {
  const name = relative(source, path).split(sep).join("/");
  if (skip.has(name)) continue;
  const data = await readFile(path),
    packed = deflateRawSync(data, { level: 9 }),
    nameBytes = Buffer.from(name),
    crc = crc32(data);
  // Fixed DOS timestamp (1980-01-01) keeps the archive reproducible.
  const fields = (header) => {
    header.writeUInt16LE(20, 4 + (header.length === 46 ? 2 : 0));
    const at = header.length === 46 ? 8 : 6;
    header.writeUInt16LE(0x0800, at); // UTF-8 names
    header.writeUInt16LE(8, at + 2); // deflate
    header.writeUInt16LE(0, at + 4);
    header.writeUInt16LE(0x21, at + 6);
    header.writeUInt32LE(crc, at + 8);
    header.writeUInt32LE(packed.length, at + 12);
    header.writeUInt32LE(data.length, at + 16);
    header.writeUInt16LE(nameBytes.length, at + 20);
  };
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0);
  fields(head);
  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4);
  fields(entry);
  entry.writeUInt32LE(offset, 42);
  local.push(head, nameBytes, packed);
  central.push(entry, nameBytes);
  offset += head.length + nameBytes.length + packed.length;
}
const directory = Buffer.concat(central),
  end = Buffer.alloc(22),
  count = central.length / 2;
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(count, 8);
end.writeUInt16LE(count, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
await mkdir(resolve("dist/extension"), { recursive: true });
await writeFile(output, Buffer.concat([...local, directory, end]));
console.log(`${relative(process.cwd(), output)}  v${version}, ${count} files`);
