import temp from "temp"
import * as path from "path"
import yargs from "yargs"
import * as fs from "fs-extra"
import * as shell from "shelljs"
const shellescape = require("shell-escape")

import * as RenameRemoved from "./rename-on-remove"
// import logger from "../logger"

export function testTorrentFactory(
  tempFolders: string[],
  MATCH_FOLDER: string = "How to",
  SAMPLE_FOLDER: string = "Faker - Folder Name (2020-01-01) [Studio - Category]",
  SAMPLE_FILE: string = "fake-torrent-file-name.mp4"
) {
  jest.mock("yargs")
  return function createTempTorrent(torrent?: RenameRemoved.TorrentArgs, file?: string, match: boolean = true) {
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
    yargs.argv.unwrap = false
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
      targetFile: path.join(torrentFolder, path.basename(torrentFolder) + path.extname(fileName)),
    }
  }
}
