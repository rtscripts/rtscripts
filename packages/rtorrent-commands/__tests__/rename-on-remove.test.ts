import temp from "temp";
import * as path from "path";
import yargs from "yargs";
import * as fs from "fs";
import * as shell from "shelljs";

import * as RenameRemoved from "../src/commands/rename-on-remove";
import logger from "../src/logger";

jest.mock("yargs");

describe("rename-on-remove", () => {
  let tempFolder: string;
  let torrentFolder: string;
  let torrentFile: string;
  let nfoFile: string;
  const folderName = "Faker - Folder Name (2020-01-01) [Studio - Category]";
  const fileName = "fake-torrent-file-name.mp4";

  // console.log = jest.fn();
  logger.level = "critical";

  const folderList = async (label?: string, folder?: string) =>
    console.log(
      `[TEST] torrent folder ${label ? "(" + label + ")" : ""}`,
      (await shell.exec(`ls -lh '${folder || torrentFolder}'`))
        .toString()
        .split("\n")
        .filter(
          (row) => !row.trim().endsWith(".") && !row.trim().endsWith("..")
        )
        .join("\n")
    );

  beforeAll(() => {
    temp.track();
    tempFolder = temp.mkdirSync("rename-on-remove");
    fs.mkdirSync(path.resolve(tempFolder, "How to"));
    torrentFolder = path.resolve(tempFolder, "How to", folderName);
    fs.mkdirSync(torrentFolder);
    torrentFile = path.resolve(torrentFolder, fileName);
    nfoFile = path.resolve(torrentFolder, fileName + ".rename.nfo");
    fs.writeFileSync(torrentFile, "empty-test");
    console.log("[TEST] Created", torrentFile);
    yargs.argv.name = fileName;
    yargs.argv.basePath = torrentFile;
    yargs.argv.directory = torrentFolder;
    yargs.argv.complete = 1;
  });

  afterAll(async () => {
    await folderList();
    console.log("[TEST] Clearing temporary files");
    temp.cleanupSync();
    jest.restoreAllMocks();
  });

  it("should recognize renamable torrent", async () => {
    yargs.argv.complete = 1;
    const isTorrentRenamableSpy = jest.spyOn(
      RenameRemoved,
      "isTorrentRenamable"
    );
    await RenameRemoved.main();
    expect(isTorrentRenamableSpy).toBeCalled();
    expect(isTorrentRenamableSpy).toHaveReturnedWith(true);
    isTorrentRenamableSpy.mockRestore();
  });
  it("should ignore un-renamable torrent", async () => {
    yargs.argv.complete = 0;
    const isTorrentRenamableSpy = jest.spyOn(
      RenameRemoved,
      "isTorrentRenamable"
    );
    await RenameRemoved.main();
    expect(isTorrentRenamableSpy).toBeCalled();
    expect(isTorrentRenamableSpy).toHaveReturnedWith(false);
    isTorrentRenamableSpy.mockRestore();
  });
  it("should ignore torrent trailers and previews", async () => {
    const sampleMovie = path.resolve(torrentFolder, "amother.file-sample.mp4");
    const previewMovie = path.resolve(
      torrentFolder,
      "some.rich.title.preview.of.movie.mp4"
    );
    fs.writeFileSync(sampleMovie, "empty-test");
    fs.writeFileSync(previewMovie, "empty-test");
    await RenameRemoved.main();
    expect(fs.existsSync(torrentFile)).toBeFalsy();
    expect(fs.existsSync(sampleMovie)).toBeTruthy();
    expect(fs.existsSync(previewMovie)).toBeTruthy();
  });

  it("should rename torrent in-place", async () => {
    await RenameRemoved.main();
    expect(fs.existsSync(torrentFile)).toBeFalsy();
  });
  it("should make valid original.mp4.rename.nfo", async () => {
    await RenameRemoved.main();
    // expect(fs.existsSync(torrentFile)).toBeFalsy();
    expect(fs.existsSync(nfoFile)).toBeTruthy();

    const filename = path.basename(torrentFile);
    const nfo = JSON.parse(fs.readFileSync(nfoFile).toString());
    expect(nfo).toBeTruthy();
    expect(nfo.torrent).toHaveProperty("basePath", torrentFile);
    expect(nfo.torrent).toHaveProperty("name", filename);
    expect(nfo.action).toHaveProperty("from_file", torrentFile);
    expect(nfo.action).toHaveProperty("to_file");
    // console.log("[TEST] nfo", nfo);
    // await folderList("after nfo");
  });
});
