import temp from "temp";
import * as path from "path";
import yargs from "yargs";
import * as fs from "fs";
import * as shell from "shelljs";

import * as RenameRemoved from "../src/commands/rename-on-remove";
import logger from "../src/logger";

jest.mock("yargs");

console.log = jest.fn();

describe("rename-on-remove", () => {
  let tempFolder: string;
  let torrentFolder: string;
  let torrentFile: string;
  let nfoFile: string;
  const folderName = "Faker - Folder Name (2020-01-01) [Studio - Category]";
  const fileName = "fake-torrent-file-name.mp4";
  logger.level = "critical";

  // const folderList = async (label?: string, folder?: string) =>
  //   console.log(
  //     `[TEST] torrent folder ${label ? "(" + label + ")" : ""}`,
  //     (await shell.exec(`ls -lh '${folder || torrentFolder}'`))
  //       .toString()
  //       .split("\n")
  //       .filter(
  //         (row) => !row.trim().endsWith(".") && !row.trim().endsWith("..")
  //       )
  //       .join("\n")
  //   );
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

  afterAll(async () => {
    console.log("[TEST] Clearing temporary files");
    temp.cleanupSync();
    jest.restoreAllMocks();
  });

  describe("verify event", () => {
    it("should recognize renamable torrent", () => {
      yargs.argv.complete = 1;
      const spy = jest.spyOn(RenameRemoved, "isTorrentRenamable");
      RenameRemoved.main();
      expect(spy).toBeCalled();
      expect(spy).toHaveReturnedWith(true);
      spy.mockRestore();
    });
    it("should ignore un-renamable torrent", () => {
      yargs.argv.complete = 0;
      const spy = jest.spyOn(RenameRemoved, "isTorrentRenamable");
      RenameRemoved.main();
      expect(spy).toBeCalled();
      expect(spy).toHaveReturnedWith(false);
      spy.mockRestore();
    });
    it("should ignore torrent trailers and previews", () => {
      const sampleMovie = path.resolve(
        torrentFolder,
        "amother.file-sample.mp4"
      );
      const previewMovie = path.resolve(
        torrentFolder,
        "some.rich.title.preview.of.movie.mp4"
      );
      fs.writeFileSync(sampleMovie, "empty-test");
      fs.writeFileSync(previewMovie, "empty-test");
      RenameRemoved.main();
      expect(fs.existsSync(torrentFile)).toBeFalsy();
      expect(fs.existsSync(sampleMovie)).toBeTruthy();
      expect(fs.existsSync(previewMovie)).toBeTruthy();
    });
  });
  describe("rename torrent movie file", () => {
    it("should rename torrent in-place", async () => {
      RenameRemoved.main();
      expect(fs.existsSync(torrentFile)).toBeFalsy();
    });
    it("should make valid original.mp4.rename.nfo", async () => {
      RenameRemoved.main();
      expect(fs.existsSync(torrentFile)).toBeFalsy();
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
});
