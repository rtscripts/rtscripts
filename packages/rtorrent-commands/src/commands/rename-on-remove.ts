#!/usr/bin/env node
import * as fs from "fs"
import * as path from "path"

import Arguments from "yargs"

export const DIRECTORY_MATCH = /How to/i
export const NFO_NAME = "original.json"

export const yargs = Arguments.option("directory", {
  required: true,
  type: "string",
  description: "folder containing torrent",
})
  .option("base-path", {
    required: true,
    type: "string",
    description: "path to torrent files",
  })
  .option("complete", {
    type: "number",
    description: "has torrent completed",
    default: 1,
  })

import logger from "../logger"

export interface TorrentArgs {
  // required
  directory: string
  // basePath: string;
  complete: number
  // optional
  name: string
  hash?: string
  tiedToFile?: number
  isMultiFile?: number
  // unused
  // sessionPath: string;
  // hashing: number;
}

export const getTorrentFromArgs = (args: any): TorrentArgs => {
  const torrent = {
    name: args.name,
    directory: args.directory,
    // basePath: args.basePath,
    complete: args.complete,
    hash: args.hash,
    // sessionPath: args.sessionPath,
    // hashing: args.hashing,
    tiedToFile: args.tiedToFile,
    isMultiFile: args.isMultiFile,
  }
  return torrent
}

export const isTorrentRenamable = (torrent: TorrentArgs): boolean => {
  return (
    DIRECTORY_MATCH.test(torrent.directory) && torrent.complete >= 1
    //  && path.basename(torrent.directory) !== torrent.name
  )
}

export const MovieTypes = [".mp4", ".wmv", ".avi"]

export const getMoviesInFolder = (folder: string) => {
  const files = fs.readdirSync(folder)
  return (
    files
      // ignore trailers, clips, sample etc
      .filter((row) => {
        return (
          path.basename(row).indexOf("sample") < 0 &&
          path.basename(row).indexOf("preview") < 0 &&
          path.basename(row).indexOf("trailer") < 0
        )
      })
      .filter((row) => {
        // console.log("ext", path.extname(row));
        return MovieTypes.indexOf(path.extname(row)) >= 0
      })
      .map((row) => {
        return path.resolve(folder, row)
      })
  )
}

export const getTorrentDirectory = (torrent: TorrentArgs) => {
  if (path.basename(torrent.directory) !== torrent.name) {
    return torrent.directory
  }
  return torrent.directory.replace("/" + torrent.name, "").trim()
}

export const renameTorrent = async (torrent: TorrentArgs) => {
  const torrentDir = getTorrentDirectory(torrent)
  const torrentFolder = path.basename(torrentDir)
  logger.debug("Reading folder:", `'${torrentFolder}'`)
  const movieFiles = getMoviesInFolder(torrent.directory)
  logger.debug("Found Movies:", `${movieFiles}`)
  logger.info("Rename using", torrentFolder)
  if (movieFiles.length === 1) {
    for (const from_file of movieFiles) {
      const filename = path.basename(from_file)
      const ext = path.extname(from_file)
      const to_file = path.join(torrentDir, torrentFolder + ext)
      const action = {
        from_file,
        to_file,
        filename,
        ext,
        date: new Date().toISOString(),
      }
      fs.renameSync(from_file, to_file)
      // write nfo log
      const nfoContent = JSON.stringify({ torrent, action }, null, 2)
      const nfoFile = path.join(torrentDir, filename + ".rename.nfo")
      fs.writeFileSync(nfoFile, nfoContent)
    }
  }
}

export const main = () => {
  const argv = yargs.argv
  logger.debug("raw-arguments", argv)
  const torrent = getTorrentFromArgs(argv)

  if (isTorrentRenamable(torrent)) {
    logger.info("Matched a Torrent!", torrent)
    if (torrent.complete <= 0) {
      logger.warn("Removed match but torrent incomplete!", torrent)
    } else {
      return renameTorrent(torrent)
    }
  } else {
    logger.silly("ignored", argv.name)
    // write nfo log
    const nfoContent = JSON.stringify({ torrent }, null, 2)
    const nfoFile = path.resolve(torrent.directory, torrent.hash + ".rename-ignored.nfo")
    fs.writeFileSync(nfoFile, nfoContent)
  }
}

if (require.main === module) {
  main()
    ?.then(() => {
      process.exit(0)
    })
    .catch((err) => {
      process.exit(err)
    })
}

export default main
