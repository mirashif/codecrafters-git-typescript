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
    const decompressed = inflateSync(new Uint8Array(data)).toString();
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
    const filePath = writeObj ? args[2] : args[1];
    const fileContent = readFileSync(filePath);
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
      const compressedData = deflateSync(new Uint8Array(fileContent));
      writeFileSync(hashObjectFilePath, new Uint8Array(compressedData));
    }
    process.stdout.write(sha1);
    break;

  /* 
  Tests
  The tester will use your program to initialize a new repository:

  $ mkdir test_dir && cd test_dir
  $ /path/to/your_program.sh init
  It'll then write a tree object to the .git/objects directory.

  It'll then run your program like this:

  $ /path/to/your_program.sh ls-tree --name-only <tree_sha>
  It'll verify that the output of your program matches the contents of the tree object.

  For a directory structure like this:

  your_repo/
    - file1
    - dir1/
      - file_in_dir_1
      - file_in_dir_2
    - dir2/
      - file_in_dir_3
  The output expected is:

  dir1
  dir2
  file1
  Notes
  In a tree object file, the SHA hashes are not in hexadecimal format. They're just raw bytes (20 bytes long).
  In a tree object file, entries are sorted by their name. The output of ls-tree matches this order.


ashif in ~/Developer/sandbox/codecrafters-git-typescript on master ● λ git ls-tree cf25e866a2971ad6c772cec7186553b5892031eb                                        
040000 tree ceaa32026e6ed5b62e49602907acf6e84a371313    .codecrafters
100644 blob 176a458f94e0ea5272ce67c36bf30b6be9caf623    .gitattributes
100644 blob c2658d7d1b31848c3b71960543cb0368e56cd4c7    .gitignore
100644 blob 4b165b058d5930e4fa5c2277b2c9f8ede04aed9f    README.md
040000 tree 60e27361a44bf4126189e2f42ae981542f0411c2    app
100755 blob ccc33e126ad9e7a849962f7fafef1d9a2e956bd5    bun.lockb
100644 blob a263216b54b95a17266ce03393005611a43213eb    codecrafters.yml
100644 blob 9d20e8e63083cdae6aff902fef74ed95612eb86c    package.json
100644 blob 238655f2ce24cd6f677057d7eaa8822e75aeb6b8    tsconfig.json
100755 blob fcc2fd5faa528f966cbaa64c267df03332d890ed    your_program.sh

ashif in ~/Developer/sandbox/codecrafters-git-typescript on master ● λ bun dev ls-tree cf25e866a2971ad6c772cec7186553b5892031eb
$ bun run app/main.ts ls-tree "cf25e866a2971ad6c772cec7186553b5892031eb"
40000 .codecrafters Ϊ2nnն.I`)���J710
0644 .gitattributes jE����Rr�g�k�
                                 k���#
100644 .gitignore �e�}��;q�C�h�l��
100644 README.md K[�Y0��\"w�����J�4
0000 app `�sa�K�a���*�T/�1
00755 bun.lockb ��>j��I�/���.�k�1
00644 codecrafters.yml �c!kT�Z&l�3�V�2�
100644 package.json � ��0�ͮj��/�t�a.�l10
0644 tsconfig.json #�U��$�ogpW�ꨂ.u���10
0755 your_program.sh ���_�R��l��L&}�32ؐ�
  
   */
  case Commands.LSTree:
    const showNameOnly = args[1] === "--name-only";
    const treeSha = showNameOnly ? args[2] : args[1];
    const treeObjectPath = treeSha.slice(0, 2) + "/" + treeSha.slice(2);
    const treeCompressedData = readFileSync(".git/objects/" + treeObjectPath);
    const decompressedTreeData = inflateSync(
      new Uint8Array(treeCompressedData)
    );
    const treeContent = decompressedTreeData.toString();
    const treeNullByteIndex = treeContent.indexOf("\x00");
    const treeEntriesData = treeContent.slice(treeNullByteIndex + 1);

    const treeEntriesOutput = [];
    let index = 0;
    while (index < treeEntriesData.length) {
      const modeEndIndex = treeEntriesData.indexOf(" ", index);
      const mode = treeEntriesData.slice(index, modeEndIndex);
      index = modeEndIndex + 1;
      const fileNameEndIndex = treeEntriesData.indexOf("\x00", index);
      const fileName = treeEntriesData.slice(index, fileNameEndIndex);
      index = fileNameEndIndex + 1;
      const shaBin = treeEntriesData.slice(index, index + 20);
      const entryHash = Buffer.from(shaBin).toString("hex");

      index += 20;
      if (showNameOnly) {
        treeEntriesOutput.push(fileName.toString());
      } else {
        treeEntriesOutput.push(
          `${mode.toString()} ${entryHash} ${fileName.toString()}`
        );
      }
    }

    treeEntriesOutput.forEach((entry) => console.log(entry));

    break;

  default:
    throw new Error(`Unknown command ${command}`);
}
