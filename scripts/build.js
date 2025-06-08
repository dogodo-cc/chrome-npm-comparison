import { readFile, writeFile, rm, copyFile, cp } from "node:fs/promises";
import { join } from "node:path";
import { exec } from "node:child_process";

const root = process.cwd();

(async function () {
  await rm(join(root, "dist"), { recursive: true, force: true });

  await cp(join(root, "images/"), join(root, "dist/images/"), {
    recursive: true,
  });

  await cp(join(root, "src/"), join(root, "dist/src/"), {
    recursive: true,
  });

  await copyFile(
    join(root, "page-popup.html"),
    join(root, "dist/page-popup.html")
  );

  // copy manifest.json and remove development suffix
  const manifest = JSON.parse(await readFile(join(root, "manifest.json")));
  manifest.name = manifest.name.replace("-development", "");
  await writeFile(
    join(root, "dist/manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  await rm(join(root, "chrom-npm-comparison.zip"), { force: true });

  // only for macOS
  exec("zip -r chrom-npm-comparison.zip dist");
})();
