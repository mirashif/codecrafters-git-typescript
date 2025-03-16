import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { deflateSync, inflateSync } from "zlib";

const args = process.argv.slice(2);
const command = args[0];

enum Commands {
  Init = "init",
  CatFile = "cat-file",
  HashObject = "hash-object",
}

switch (command) {
  case Commands.Init:
    // You can use print statements as follows for debugging, they'll be visible when running tests.
    // console.error("Logs from your program will appear here!");

    // Uncomment this block to pass the first stage
    mkdirSync(".git", { recursive: true });
    mkdirSync(".git/objects", { recursive: true });
    mkdirSync(".git/refs", { recursive: true });
    writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
    console.log("Initialized git directory");
    break;

  case Commands.CatFile:
    // Uncomment this block to pass the second stage
    const blobSha = args[2];
    const objectPath = blobSha.slice(0, 2) + "/" + blobSha.slice(2);
    const data = readFileSync(".git/objects/" + objectPath);
    const decompressed = inflateSync(data).toString();
    const nullByteIndex = decompressed.indexOf("\x00");
    const content = decompressed.slice(nullByteIndex + 1);
    process.stdout.write(content);
    break;

  /* 
  Tests
  The tester will first initialize a new git repository using your program:

  $ mkdir test_dir && cd test_dir
  $ /path/to/your_program.sh init
  It'll write some random data to a file:

  $ echo "hello world" > test.txt
  It'll then run your program like this:

  $ ./your_program.sh hash-object -w test.txt
  3b18e512dba79e4c8300dd08aeb37f8e728b8dad
  The tester will verify that:

  Your program prints a 40-character SHA hash to stdout
  The file written to .git/objects matches what the official git implementation would write
  Notes
  Although the object file is stored with zlib compression, the SHA hash needs to be computed over the "uncompressed" contents of the file, not the compressed version.
  The input for the SHA hash is the header (blob <size>\0) + the actual contents of the file, not just the contents of the file.
   */
  case Commands.HashObject:
    const writeObj = args[1] === "-w";
    const filePath = args[2];
    const fileContent = readFileSync(filePath, { encoding: "utf-8" });
    const fileSize = Buffer.byteLength(fileContent);
    const header = `blob ${fileSize}\0`;
    const sha1 = createHash("sha1")
      .update(header + fileContent)
      .digest("hex");

    const hashObjectFileName = sha1.slice(2);
    const hashObjectFileDir = ".git/objects/" + sha1.slice(0, 2);
    const hashObjectFilePath = `${hashObjectFileDir}/${hashObjectFileName}`;

    if (writeObj) {
      if (!existsSync(hashObjectFileDir)) {
        mkdirSync(hashObjectFileDir, { recursive: true });
      }
      const compressedData = deflateSync(header + fileContent);
      writeFileSync(hashObjectFilePath, compressedData);
    }
    process.stdout.write(sha1);
    break;

  default:
    throw new Error(`Unknown command ${command}`);
}
