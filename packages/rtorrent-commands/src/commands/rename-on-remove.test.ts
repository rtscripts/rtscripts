import temp from "temp";
import * as path from "path";
import yargs from "yargs";
import * as fs from "fs-extra";
import * as shell from "shelljs";
const shellescape = require("shell-escape");

import * as RenameRemoved from "./rename-on-remove";
import logger from "../logger";

const SAMPLE_FOLDER = "Faker - Folder Name (2020-01-01) [Studio - Category]";
const SAMPLE_FILE = "fake-torrent-file-name.mp4";
const MATCH_FOLDER = "How to";

describe("rename-on-remove", () => {
  let tempFolders: string[] = [];

  jest.mock("yargs");
  console.log = jest.fn();
  logger.level = "critical";

  function createTempTorrent(
    folderName?: string,
    fileName?: string,
    matchFolder?: string,
    skip_yargs: boolean | null = false
  ) {
    folderName = folderName || SAMPLE_FOLDER;
    fileName = fileName || SAMPLE_FILE;
    matchFolder = matchFolder || MATCH_FOLDER;

    temp.track();
    const tempFolder = temp.mkdirSync({ prefix: "rename-on-remove" });
    tempFolders.push(tempFolder);

    const torrentFolder = path.resolve(tempFolder, matchFolder, folderName);
    fs.ensureDirSync(torrentFolder);
    const torrentFile = path.resolve(torrentFolder, fileName);
    fs.writeFileSync(torrentFile, "null");

    const nfoFile = path.resolve(torrentFolder, fileName + ".rename.nfo");

    const fileList = async (label?: string) => {
      console.log("torrentFolder", torrentFolder);
      const bash = shellescape(["ls", "-lh", torrentFolder]);
      const files = (await shell.exec(bash, { silent: true }))
        .toString()
        .split("\n")
        .filter((row) => !row.trim().endsWith(".") && !row.trim().endsWith(".."))
        .map((row) => row.trim())
        .filter((row) => row && row.length > 0);
      files[0] = "total " + (files.length - 1);
      return files;
    };
    if (!skip_yargs) {
      yargs.argv.name = fileName;
      yargs.argv.basePath = torrentFile;
      yargs.argv.directory = torrentFolder;
      yargs.argv.complete = 1;
    }

    const renamedFile = path.join(torrentFolder, folderName + path.extname(fileName));

    return {
      torrentFolder,
      fileName,
      ext: path.extname(fileName),
      torrentFile,
      nfoFile,
      fileList,
      renamedFile,
      matchFolder,
    };
  }

  describe("renaming", () => {
    afterAll(async () => {
      if (tempFolders && tempFolders.length > 0) {
        console.log("[TEST] Clearing temporary files");
        temp.cleanupSync();
        jest.restoreAllMocks();
        tempFolders = [];
      }
    });

    it("should rename torrent in-place", async () => {
      const temp = createTempTorrent();
      await RenameRemoved.main();
      expect(fs.existsSync(temp.torrentFile)).toBeFalsy();
      expect(fs.existsSync(temp.renamedFile)).toBeTruthy();
    });

    it("should make valid original.mp4.rename.nfo", async () => {
      const temp = createTempTorrent();
      await RenameRemoved.main();
      expect(fs.existsSync(temp.nfoFile)).toBeTruthy();

      const filename = path.basename(temp.torrentFile);
      const nfo = JSON.parse(fs.readFileSync(temp.nfoFile).toString());
      expect(nfo).toBeTruthy();
      expect(nfo.torrent).toHaveProperty("basePath", temp.torrentFile);
      expect(nfo.torrent).toHaveProperty("name", filename);
      expect(nfo.action).toHaveProperty("from_file", temp.torrentFile);
      expect(nfo.action).toHaveProperty("to_file");
    });

    it("can accept quotes", async () => {
      const temp = createTempTorrent("Can't - Not Rename Me (2020) [Studio Name]", "Can't.Not.Rename.Me.mp4");
      await RenameRemoved.main();
      expect(fs.existsSync(temp.torrentFile)).toBeFalsy();
      expect(fs.existsSync(temp.renamedFile)).toBeTruthy();
      console.log("[TEST]", "files", (await temp.fileList()).join("\n"));
    });

    it.skip("can handle simple folder wrapped torrents", () => {
      //
    });
  });

  describe("validations", () => {
    it("should recognize renamable torrent", async () => {
      yargs.argv.complete = 1;
      createTempTorrent();
      const isTorrentRenamableSpy = jest.spyOn(RenameRemoved, "isTorrentRenamable");
      await RenameRemoved.main();
      expect(isTorrentRenamableSpy).toBeCalled();
      expect(isTorrentRenamableSpy).toHaveReturnedWith(true);
      isTorrentRenamableSpy.mockRestore();
    });
    it("should ignore un-renamable torrent", async () => {
      yargs.argv.complete = 0;
      const isTorrentRenamableSpy = jest.spyOn(RenameRemoved, "isTorrentRenamable");
      await RenameRemoved.main();
      expect(isTorrentRenamableSpy).toBeCalled();
      expect(isTorrentRenamableSpy).toHaveReturnedWith(false);
      isTorrentRenamableSpy.mockRestore();
    });

    it("should ignore torrent trailers and previews", async () => {
      const sampleMovie = createTempTorrent("Amother File", "amother.file-sample.mp4");
      const previewMovie = createTempTorrent("Some Rich Title (2009)", "some.rich.title.preview.of.movie.mp4");
      await RenameRemoved.main();
      // original torrent file name should still exist..
      expect(fs.existsSync(sampleMovie.torrentFile)).toBeTruthy();
      expect(fs.existsSync(previewMovie.torrentFile)).toBeTruthy();
    });
  });
});
