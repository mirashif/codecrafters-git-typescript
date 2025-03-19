import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { deflateSync, inflateSync } from "zlib";

const args = process.argv.slice(2);
const command = args[0];

enum Commands {
  Init = "init",
  CatFile = "cat-file",
  HashObject = "hash-object",
  LSTree = "ls-tree",
}

switch (command) {
  case Commands.Init:
    mkdirSync(".git", { recursive: true });
    mkdirSync(".git/objects", { recursive: true });
    mkdirSync(".git/refs", { recursive: true });
    writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
    console.log("Initialized git directory");
    break;

  case Commands.CatFile:
    const cf_hash = args[2];
    const cf_decompressed = getDecompressedObject(cf_hash);
    const cf_nullByteIndex = cf_decompressed.indexOf(0);
    const cf_content = cf_decompressed
      .subarray(cf_nullByteIndex + 1)
      .toString();
    process.stdout.write(cf_content);
    break;

  case Commands.HashObject:
    const writeFlag = args[1] === "-w";
    const filePath = writeFlag ? args[2] : args[1];

    const fileContent = readFileSync(filePath);
    const uncompressed = Buffer.from(
      `blob ${fileContent.length}\0${fileContent}`
    );
    const hashObject = createHash("sha1")
      .update(new Uint8Array(uncompressed))
      .digest("hex");
    const compressed = deflateSync(new Uint8Array(uncompressed));

    const hashObjectDir = ".git/objects/" + hashObject.slice(0, 2);
    const hashObjectPath = `${hashObjectDir}/${hashObject.slice(2)}`;
    if (writeFlag) {
      if (!existsSync(hashObjectDir)) {
        mkdirSync(hashObjectDir, { recursive: true });
      }
      writeFileSync(hashObjectPath, new Uint8Array(compressed));
    }
    process.stdout.write(hashObject);
    break;

  case Commands.LSTree:
    const nameOnlyFlag = args[1] === "--name-only";
    const treeHash = nameOnlyFlag ? args[2] : args[1];
    if (!treeHash) {
      throw new Error("No tree hash provided");
    }

    const entries: Array<{
      mode: string;
      name: string;
      hash: string;
      type: string;
      content: string;
    }> = [];
    const treeDecompressed = getDecompressedObject(treeHash);
    const headerNullIndex = treeDecompressed.indexOf(0);
    let index = headerNullIndex + 1;
    while (index < treeDecompressed.length) {
      const entryNullIndex = treeDecompressed.indexOf(0, index);
      const hash = treeDecompressed
        .subarray(entryNullIndex + 1, entryNullIndex + 21)
        .toString("hex");
      const entryStr = treeDecompressed
        .subarray(index, entryNullIndex)
        .toString();
      let [mode, name] = entryStr.split(" ");
      mode = mode === "40000" ? "040000" : mode;
      const [type, content] = getContentAndHeader(
        getDecompressedObject(hash)
      ).header.split(" ");

      entries.push({ mode, name, hash, type, content });
      index = entryNullIndex + 21;
    }

    if (nameOnlyFlag) {
      entries.forEach((entry) => process.stdout.write(`${entry.name}\n`));
    } else {
      entries.forEach((entry) =>
        process.stdout.write(
          `${entry.mode} ${entry.type} ${entry.hash}\t${entry.name}\n`
        )
      );
    }
    break;

  default:
    throw new Error(`Unknown command ${command}`);
}

function getDecompressedObject(hash: string): Buffer {
  const filePath = `.git/objects/${hash.slice(0, 2)}/${hash.slice(2)}`;
  const compressed = readFileSync(filePath);
  const decompressed = inflateSync(new Uint8Array(compressed));
  return decompressed;
}

function getContentAndHeader(decompressed: Buffer): {
  header: string;
  content: string;
} {
  const nullByteIndex = decompressed.indexOf(0);
  const header = decompressed.subarray(0, nullByteIndex).toString();
  const content = decompressed.subarray(nullByteIndex + 1).toString();
  return { header, content };
}
