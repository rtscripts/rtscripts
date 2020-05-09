import temp from "temp"
import * as path from "path"
import yargs from "yargs"
import * as fs from "fs-extra"
import * as shell from "shelljs"
const shellescape = require("shell-escape")

import * as RenameRemoved from "./rename-on-remove"
import logger from "../logger"

const SAMPLE_FOLDER = "Faker - Folder Name (2020-01-01) [Studio - Category]"
const SAMPLE_FILE = "fake-torrent-file-name.mp4"
const MATCH_FOLDER = "How to"

describe("rename-on-remove", () => {
  let tempFolders: string[] = []

  jest.mock("yargs")
  console.log = jest.fn()
  logger.level = "critical"

  function createTempTorrent(torrent?: RenameRemoved.TorrentArgs, file?: string, match: boolean = true) {
    temp.track()
    torrent = torrent || { name: SAMPLE_FILE, directory: SAMPLE_FOLDER, complete: 1 }
    const tempFolder = temp.mkdirSync({ prefix: "rename-on-remove" })
    tempFolders.push(tempFolder)
    const directory = path.join(match ? MATCH_FOLDER : "", torrent.directory)

    if (torrent.name == path.basename(directory) && !file) {
      throw new ReferenceError("file required if torrent.name is torrent.directory basename")
    }

    if (file && torrent.name !== path.basename(directory)) {
      throw new ReferenceError("file provided but torrent.name should match torrent.directory basename")
    }

    const fileName = file || path.basename(torrent.name)

    const torrentFolder = path.resolve(tempFolder, directory)
    fs.ensureDirSync(torrentFolder)

    const torrentFile = path.resolve(torrentFolder, fileName)
    fs.writeFileSync(torrentFile, "null")

    const nfoFile = path.resolve(torrentFolder, fileName + ".rename.nfo")

    const fileList = async (cd?: string) => {
      const lsdir = path.resolve(torrentFolder, cd || "")
      const bash = shellescape(["ls", "-lh", lsdir])
      const files = (await shell.exec(bash, { silent: true }))
        .toString()
        .split("\n")
        .filter((row) => !row.trim().endsWith(".") && !row.trim().endsWith(".."))
        .map((row) => row.trim())
        .filter((row) => row && row.length > 0)
      files[0] = "total " + (files.length - 1)
      return files
    }
    yargs.argv.name = torrent.name
    yargs.argv.directory = torrentFolder
    yargs.argv.complete = torrent.complete

    const ignoreNfoFile = path.join(torrentFolder, yargs.argv.hash + ".rename-ignored.nfo")
    return {
      torrentFolder,
      fileName,
      extname: path.extname(fileName),
      torrentFile,
      nfoFile,
      fileList,
      ignoreNfoFile,
    }
  }

  describe("renaming", () => {
    afterAll(async () => {
      if (tempFolders && tempFolders.length > 0) {
        console.log("[TEST] Clearing temporary files")
        temp.cleanupSync()
        jest.restoreAllMocks()
        tempFolders = []
      }
    })

    it("should rename torrent in-place", async () => {
      const temp = createTempTorrent({ name: SAMPLE_FILE, directory: SAMPLE_FOLDER, complete: 1 })
      await RenameRemoved.main()
      expect(fs.existsSync(temp.torrentFile)).toBeFalsy()
      expect(fs.existsSync(path.join(temp.torrentFolder, SAMPLE_FOLDER + temp.extname))).toBeTruthy()
    })

    it("should make valid original.mp4.rename.nfo", async () => {
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
      const sample = {
        directory: "Can't - Not Rename Me (2020) [Studio Name]",
        name: "Can't.Not.Rename.Me.mp4",
        complete: 1,
      }
      const temp = createTempTorrent(sample)
      await RenameRemoved.main()
      expect(fs.existsSync(temp.torrentFile)).toBeFalsy()
      expect(fs.existsSync(path.join(temp.torrentFolder, sample.directory + temp.extname))).toBeTruthy()
    })

    it("can un-wrap subdir torrent file", async () => {
      const dir = "Can't - Not Rename Me (2020) [Studio Name]"
      const temp = createTempTorrent(
        {
          directory: dir + "/Studio Folder",
          name: "Studio Folder",
          complete: 1,
        },
        "Can't.Not.Rename.Me.mp4"
      )
      await RenameRemoved.main()
      expect(fs.existsSync(temp.torrentFile)).toBeFalsy()
      expect(fs.existsSync(path.join(path.resolve(temp.torrentFolder, "../"), dir + temp.extname))).toBeTruthy()
      // console.log("[TEST]", path.resolve(temp.torrentFolder, "../"), (await temp.fileList("../")).join("\n"))
      // console.log("[TEST]", path.resolve(temp.torrentFolder), (await temp.fileList()).join("\n"))
    })
  })

  describe("validations", () => {
    it("should recognize renamable torrent", async () => {
      yargs.argv.complete = 1
      createTempTorrent()
      const isTorrentRenamableSpy = jest.spyOn(RenameRemoved, "isTorrentRenamable")
      await RenameRemoved.main()
      expect(isTorrentRenamableSpy).toBeCalled()
      expect(isTorrentRenamableSpy).toHaveReturnedWith(true)
      isTorrentRenamableSpy.mockRestore()
    })
    it("should ignore un-renamable torrent", async () => {
      yargs.argv.complete = 0
      const temp = createTempTorrent(
        { directory: "Now To/Amother File", name: "amother.file-sample.mp4", complete: 1 },
        undefined,
        false
      )
      const isTorrentRenamableSpy = jest.spyOn(RenameRemoved, "isTorrentRenamable")
      await RenameRemoved.main()
      expect(isTorrentRenamableSpy).toBeCalled()
      expect(isTorrentRenamableSpy).toHaveReturnedWith(false)
      isTorrentRenamableSpy.mockRestore()
      expect(fs.existsSync(temp.ignoreNfoFile)).toBe(true)
      const ignoreNfoFile = JSON.parse(fs.readFileSync(temp.ignoreNfoFile).toString())
      expect(ignoreNfoFile).toBeTruthy()
      expect(ignoreNfoFile.torrent).toHaveProperty("name", temp.fileName)
    })

    it("should ignore torrent trailers and previews", async () => {
      const sampleMovie = createTempTorrent({
        directory: "Amother File",
        name: "amother.file-sample.mp4",
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
