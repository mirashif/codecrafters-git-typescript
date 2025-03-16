import * as fs from "fs";
import { inflateSync } from "zlib";

const args = process.argv.slice(2);
const command = args[0];

enum Commands {
  Init = "init",
  CatFile = "cat-file",
}

switch (command) {
  case Commands.Init:
    // You can use print statements as follows for debugging, they'll be visible when running tests.
    // console.error("Logs from your program will appear here!");

    // Uncomment this block to pass the first stage
    fs.mkdirSync(".git", { recursive: true });
    fs.mkdirSync(".git/objects", { recursive: true });
    fs.mkdirSync(".git/refs", { recursive: true });
    fs.writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
    console.log("Initialized git directory");
    break;

  case Commands.CatFile:
    // Uncomment this block to pass the second stage
    const blobSha = args[2];
    const objectPath = blobSha.slice(0, 2) + "/" + blobSha.slice(2);
    const data = fs.readFileSync(".git/objects/" + objectPath);
    const decompressed = inflateSync(data).toString();
    const nullByteIndex = decompressed.indexOf("\x00");
    const content = decompressed.slice(nullByteIndex + 1);
    process.stdout.write(content);
    break;

  default:
    throw new Error(`Unknown command ${command}`);
}
