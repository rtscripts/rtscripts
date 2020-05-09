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

  /*
  {
    "name": "[TeensLikeItBig] MJ Fresh - Its Just Wrestling - 04-21-2020",
    "directory": "/Volumes/1TBStorage/How to/Tits/MJ Fresh/ MJFresh & Duncan Saint - It's Just Wrestling (2020-04-21) [Brazzers - Teens Like It Big]/[TeensLikeItBig] MJ Fresh - Its Just Wrestling - 04-21-2020",
    "complete": 1,
    "hash": "F828EAF461D14F5535E9451F5B4BEA1C1493F2D9",
    "tiedToFile": "",
    "isMultiFile": 1
  }
  */

  function createTempTorrent(torrent?: RenameRemoved.TorrentArgs, match: boolean = true) {
    temp.track();
    torrent = torrent || { name: SAMPLE_FILE, directory: SAMPLE_FOLDER, complete: 1 };
    const tempFolder = temp.mkdirSync({ prefix: "rename-on-remove" });
    tempFolders.push(tempFolder);
    const directory = path.join(match ? MATCH_FOLDER : "", torrent.directory);
    const fileName = path.basename(torrent.name);

    const torrentFolder = path.resolve(tempFolder, directory);
    fs.ensureDirSync(torrentFolder);

    const torrentFile = path.resolve(torrentFolder, fileName);
    fs.writeFileSync(torrentFile, "null");

    const nfoFile = path.resolve(torrentFolder, fileName + ".rename.nfo");

    const fileList = async () => {
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
    yargs.argv.name = torrent.name;
    yargs.argv.directory = torrentFolder;
    yargs.argv.complete = 1;

    const ignoreNfoFile = path.join(torrentFolder, yargs.argv.hash + ".rename-ignored.nfo");
    return {
      torrentFolder,
      fileName,
      extname: path.extname(fileName),
      torrentFile,
      nfoFile,
      fileList,
      ignoreNfoFile,
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
      const temp = createTempTorrent({ name: SAMPLE_FILE, directory: SAMPLE_FOLDER, complete: 1 });
      await RenameRemoved.main();
      expect(fs.existsSync(temp.torrentFile)).toBeFalsy();
      expect(fs.existsSync(path.join(temp.torrentFolder, SAMPLE_FOLDER + temp.extname))).toBeTruthy();
    });

    it("should make valid original.mp4.rename.nfo", async () => {
      const temp = createTempTorrent({ name: SAMPLE_FILE, directory: SAMPLE_FOLDER, complete: 1 });
      await RenameRemoved.main();
      expect(fs.existsSync(temp.nfoFile)).toBeTruthy();

      const filename = path.basename(temp.torrentFile);
      const nfo = JSON.parse(fs.readFileSync(temp.nfoFile).toString());
      expect(nfo).toBeTruthy();
      expect(nfo.torrent).toHaveProperty("name", filename);
      expect(nfo.action).toHaveProperty("from_file", temp.torrentFile);
      expect(nfo.action).toHaveProperty("to_file");
    });

    it("can accept quotes", async () => {
      const sample = {
        directory: "Can't - Not Rename Me (2020) [Studio Name]",
        name: "Can't.Not.Rename.Me.mp4",
        complete: 1,
      };
      const temp = createTempTorrent(sample);
      await RenameRemoved.main();
      expect(fs.existsSync(temp.torrentFile)).toBeFalsy();
      expect(fs.existsSync(path.join(temp.torrentFolder, sample.directory + temp.extname))).toBeTruthy();
    });

    it.skip("can handle simple folder wrapped torrents", async () => {
      const temp = createTempTorrent({
        directory: "Can't - Not Rename Me (2020) [Studio Name]/Studio Folder",
        name: "Can't.Not.Rename.Me.mp4",
        complete: 1,
      });
      await RenameRemoved.main();
      // expect(fs.existsSync(temp.torrentFile)).toBeFalsy();
      // expect(fs.existsSync(temp.renamedFile)).toBeTruthy();
      console.log("[TEST]", temp.torrentFolder, (await temp.fileList()).join("\n"));
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
      const temp = createTempTorrent(
        { directory: "Now To/Amother File", name: "amother.file-sample.mp4", complete: 1 },
        false
      );
      const isTorrentRenamableSpy = jest.spyOn(RenameRemoved, "isTorrentRenamable");
      await RenameRemoved.main();
      expect(isTorrentRenamableSpy).toBeCalled();
      expect(isTorrentRenamableSpy).toHaveReturnedWith(false);
      isTorrentRenamableSpy.mockRestore();
      expect(fs.existsSync(temp.ignoreNfoFile)).toBe(true);
      const ignoreNfoFile = JSON.parse(fs.readFileSync(temp.ignoreNfoFile).toString());
      expect(ignoreNfoFile).toBeTruthy();
      expect(ignoreNfoFile.torrent).toHaveProperty("name", temp.fileName);

      // console.log("[TEST]", "files", (await sampleMovie.fileList()).join("\n"));
      // console.log("[TEST]", "ignoreNfoFile", ignoreNfoFile);
    });

    it("should ignore torrent trailers and previews", async () => {
      const sampleMovie = createTempTorrent({
        directory: "Amother File",
        name: "amother.file-sample.mp4",
        complete: 1,
      });
      const previewMovie = createTempTorrent({
        directory: "Some Rich Title (2009)",
        name: "some.rich.title.preview.of.movie.mp4",
        complete: 1,
      });
      await RenameRemoved.main();
      // original torrent file name should still exist..
      expect(fs.existsSync(sampleMovie.torrentFile)).toBeTruthy();
      expect(fs.existsSync(previewMovie.torrentFile)).toBeTruthy();
    });
  });
});
