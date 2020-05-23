import temp from "temp"
import * as path from "path"
import yargs from "yargs"
import * as fs from "fs-extra"
// import * as shell from "shelljs"
// const shellescape = require("shell-escape")
import { testTorrentFactory } from "./test-helpers"
import * as RenameRemoved from "./rename-on-remove"
import logger from "../logger"

const SAMPLE_FOLDER = "Subdir-One/Two/Faker - Folder Name (2020-01-01) [Studio - Category]"
const SAMPLE_FILE = "fake-torrent-file-name.mp4"
const MATCH_FOLDER = "Videos"
const SUBDIR_DEPTH = 3

describe("rename-on-remove", () => {
  let tempFolders: string[] = []

  jest.mock("yargs")
  // console.log = jest.fn()
  logger.level = "critical"

  const createTempTorrent = testTorrentFactory(tempFolders, MATCH_FOLDER, SAMPLE_FOLDER, SAMPLE_FILE)
  describe.skip("defaults", () => {})
  describe("renaming", () => {
    yargs.argv.depth = SUBDIR_DEPTH
    yargs.argv.dirMatch = MATCH_FOLDER
    afterAll(async () => {
      if (tempFolders && tempFolders.length > 0) {
        console.log("[TEST] Clearing temporary files")
        temp.cleanupSync()
        jest.restoreAllMocks()
        tempFolders = []
      }
    })

    it("can rename torrent in-place", async () => {
      const sample = createTempTorrent({ name: SAMPLE_FILE, directory: SAMPLE_FOLDER, complete: 1 })
      await RenameRemoved.main()
      const originalFileExists = fs.existsSync(sample.torrentFile)
      expect(originalFileExists).toBeFalsy()
      const renamedFileExists = fs.existsSync(sample.targetFile)
      expect(renamedFileExists).toBeTruthy()
    })

    it("can make valid original.mp4.rename.nfo", async () => {
      const temp = createTempTorrent({ name: SAMPLE_FILE, directory: SAMPLE_FOLDER, complete: 1 })
      await RenameRemoved.main()
      expect(fs.existsSync(temp.nfoFile)).toBeTruthy()

      const filename = path.basename(temp.torrentFile)
      const nfo = JSON.parse(fs.readFileSync(temp.nfoFile).toString())
      expect(nfo).toBeTruthy()
      expect(nfo.torrent).toHaveProperty("name", filename)
      expect(nfo.action).toHaveProperty("from_file", temp.torrentFile)
      expect(nfo.action).toHaveProperty("to_file")
    })

    it("can accept quotes", async () => {
      const sample = createTempTorrent({
        directory: "One/Two/Can't - Not Rename Me (2020) [Studio Name]",
        name: "Can't.Not.Rename.Me.mp4",
        complete: 1,
      })
      await RenameRemoved.main()
      expect(fs.existsSync(sample.torrentFile)).toBeFalsy()
      expect(fs.existsSync(sample.targetFile)).toBeTruthy()
    })

    it("can un-wrap when --depth is 3", async () => {
      const folder_name = "My Movie - To Rename Me (2020) [Studio Name]"
      const directory = path.join("One/Two", folder_name, "/Final-File-Beside-This-Folder")
      const sample = createTempTorrent({
        directory,
        name: "my.movie.mp4",
        complete: 1,
      })
      yargs.argv.depth = 3
      yargs.argv.unwrap = true
      const isTorrentRenamableSpy = jest.spyOn(RenameRemoved, "isTorrentRenamable")
      await RenameRemoved.main()
      expect(isTorrentRenamableSpy).toHaveReturnedWith(true)
      const targetFile = path.join(path.resolve(sample.torrentFolder, "../"), folder_name + sample.extname)
      // console.log("[PARENT]", path.resolve(sample.torrentFolder, "../"), (await sample.fileList("../")).join("\n"))
      // console.log("[CHILD]", path.resolve(sample.torrentFolder), (await sample.fileList()).join("\n"))
      expect(fs.existsSync(sample.torrentFile)).toBeFalsy()
      expect(fs.existsSync(targetFile)).toBeTruthy()
    })
  })

  describe("validations", () => {
    it("should recognize when (torrent) --complete is 1", async () => {
      yargs.argv.complete = 1
      createTempTorrent()
      const isTorrentRenamableSpy = jest.spyOn(RenameRemoved, "isTorrentRenamable")
      await RenameRemoved.main()
      expect(isTorrentRenamableSpy).toHaveReturnedWith(true)
      isTorrentRenamableSpy.mockRestore()
    })
    it("should ignore when (torrent) --complete is 0", async () => {
      const sample = createTempTorrent()
      yargs.argv.complete = 0
      // yargs.argv.depth = 0
      const isTorrentRenamableSpy = jest.spyOn(RenameRemoved, "isTorrentRenamable")
      await RenameRemoved.main()
      expect(isTorrentRenamableSpy).toHaveReturnedWith(false)
      isTorrentRenamableSpy.mockRestore()
      expect(fs.existsSync(sample.ignoreNfoFile)).toBe(true)
      const ignoreNfoFile = JSON.parse(fs.readFileSync(sample.ignoreNfoFile).toString())
      expect(ignoreNfoFile).toBeTruthy()
      expect(ignoreNfoFile.torrent).toHaveProperty("name", sample.fileName)
    })
    it("should recognize when (dir) --match", async () => {
      yargs.argv.complete = 1
      createTempTorrent()
      const isTorrentRenamableSpy = jest.spyOn(RenameRemoved, "isTorrentRenamable")
      await RenameRemoved.main()
      expect(isTorrentRenamableSpy).toHaveReturnedWith(true)
      isTorrentRenamableSpy.mockRestore()
    })
    it("should ignore when (dir) --match is 'nowhere'", async () => {
      yargs.argv.complete = 1
      createTempTorrent()
      const isTorrentRenamableSpy = jest.spyOn(RenameRemoved, "isTorrentRenamable")
      await RenameRemoved.main()
      expect(isTorrentRenamableSpy).toHaveReturnedWith(true)
      isTorrentRenamableSpy.mockRestore()
    })
    it("should recognize when (subdir) --depth equals 5", async () => {
      yargs.argv.complete = 1
      yargs.argv.depth = 5
      createTempTorrent({
        directory: path.join("One/Two/Three/Four/Five - Movie (YYYY)"),
        name: "movie.file-sample.mp4",
        complete: 1,
      })
      const isTorrentRenamableSpy = jest.spyOn(RenameRemoved, "isTorrentRenamable")
      await RenameRemoved.main()
      expect(isTorrentRenamableSpy).toHaveReturnedWith(true)
      isTorrentRenamableSpy.mockRestore()
    })
    it("should ignore when (subdir) --depth is incorrect", async () => {
      yargs.argv.complete = 1
      yargs.argv.depth = 3
      const temp = createTempTorrent({
        directory: "One/Two",
        name: "amother.file-sample.mp4",
        complete: 1,
      })
      const isTorrentRenamableSpy = jest.spyOn(RenameRemoved, "isTorrentRenamable")
      await RenameRemoved.main()
      expect(isTorrentRenamableSpy).toHaveReturnedWith(false)
      isTorrentRenamableSpy.mockRestore()
      expect(fs.existsSync(temp.ignoreNfoFile)).toBe(true)
      const ignoreNfoFile = JSON.parse(fs.readFileSync(temp.ignoreNfoFile).toString())
      expect(ignoreNfoFile).toBeTruthy()
      expect(ignoreNfoFile.torrent).toHaveProperty("name", temp.fileName)
    })
    it("should ignore when (subdir) --depth is 0", async () => {
      yargs.argv.complete = 1
      yargs.argv.depth = 0
      createTempTorrent({
        directory: "One/Movie (YYYY)",
        name: "movie.file-sample.mp4",
        complete: 1,
      })
      const isTorrentRenamableSpy = jest.spyOn(RenameRemoved, "isTorrentRenamable")
      await RenameRemoved.main()
      expect(isTorrentRenamableSpy).toHaveReturnedWith(true)
      isTorrentRenamableSpy.mockRestore()
    })

    it("should ignore torrent trailers and previews", async () => {
      const sampleMovie = createTempTorrent({
        directory: "Videos/Studio (YYYY)",
        name: "Studio.YYYY.file-sample.mp4",
        complete: 1,
      })
      const previewMovie = createTempTorrent({
        directory: "Some Rich Title (2009)",
        name: "some.rich.title.preview.of.movie.mp4",
        complete: 1,
      })
      await RenameRemoved.main()
      // original torrent file name should still exist..
      expect(fs.existsSync(sampleMovie.torrentFile)).toBeTruthy()
      expect(fs.existsSync(previewMovie.torrentFile)).toBeTruthy()
    })
  })
})
