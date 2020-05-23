#!/usr/bin/env node
import * as fs from "fs"
import * as path from "path"

import Arguments from "yargs"

/**
 * Array of Regex to match valid paths for renaming
 */
export const DIRECTORY_MATCH = "How to"
/**
 * Filename put beside original file to track action history
 */
export const NFO_NAME = "original.json"
/**
 * Exact amount of sub-dirs under DIRECTORY_MATCH
 */
export const SUBDIR_DEPTH = 3

/**
 * Force the --depth to be exact
 */
export const EXACT_DEPTH_DEFAULT = false

export const yargs = Arguments.option("directory", {
  required: true,
  type: "string",
  description: "folder containing torrent",
})
  .option("complete", {
    type: "number",
    description: "has torrent completed",
    default: 1,
  })
  .option("dir-match", {
    type: "string",
    required: true,
    default: DIRECTORY_MATCH,
    description: "Regex to match valid parent folder names for renaming",
  })
  .option("depth", {
    type: "number",
    required: true,
    default: SUBDIR_DEPTH,
    description: "Minimum amount of sub-dirs under --dir-match",
  })
  .option("exact-depth", {
    type: "boolean",
    default: EXACT_DEPTH_DEFAULT,
    description: "(un-wrap mode) if --depth is set, this will use sub-dir at exact depth for renaming and destination",
  })
  .option("nfo-name", {
    type: "string",
    required: true,
    description: "Filename put beside original file to track action history",
    default: NFO_NAME,
  })

import logger from "../logger"
import { CommandResponse } from "../command-response"

export interface TorrentArgs {
  // required
  directory: string
  complete: number
  // optional
  name: string
  hash?: string
  tiedToFile?: number
  isMultiFile?: number
  // unused
  // basePath: string;
  // sessionPath: string;
  // hashing: number;
}

export interface CommandArgs {
  depth: number
  exactDepth: boolean
  dirMatch: string
  nfoName: string
}

export const getTorrentFromArgs = (args: any): TorrentArgs => {
  const torrent = {
    name: args.name,
    directory: args.directory,
    complete: args.complete,
    hash: args.hash,
    tiedToFile: args.tiedToFile,
    isMultiFile: args.isMultiFile,
  }
  return torrent
}

export function getOptionsFromArgs(args: any): CommandArgs {
  logger.silly("getOptionsFromArgs", args)
  return {
    depth: typeof args.depth !== "undefined" ? parseInt(args.depth) : SUBDIR_DEPTH,
    exactDepth: typeof args.exactDepth !== "undefined" ? args.exactDepth : EXACT_DEPTH_DEFAULT,
    nfoName: typeof args.nfoName !== "undefined" ? (args.nfoName as string) : NFO_NAME,
    dirMatch: typeof args.dirMatch !== "undefined" ? (args.dirMatch as string) : DIRECTORY_MATCH,
  }
}

export const getTorrentSubdirs = (torrent: TorrentArgs, options: CommandArgs) => {
  const directoryMatchRegex = new RegExp(options.dirMatch, "i")
  const dirs = torrent.directory.split("/")
  const matchIndex = dirs.findIndex((row) => {
    return directoryMatchRegex.test(row) ? true : 0
  })
  const subdirs = dirs.slice(matchIndex + 1)
  const subdirIndex = matchIndex + 1 + options.depth
  const destFolder = dirs.slice(0, subdirIndex).join("/")
  return {
    subdirs,
    destFolder,
  }
}

export const isTorrentRenamable = (torrent: TorrentArgs, options: CommandArgs): boolean => {
  //
  const directoryMatchRegex = new RegExp(options.dirMatch, "i")
  const directoryPasses = directoryMatchRegex.test(torrent.directory)
  //
  const completePasses = torrent.complete >= 1
  //
  const subdirs = getTorrentSubdirs(torrent, options).subdirs
  let depthPasses = true

  if (options.depth > 0) {
    depthPasses = subdirs.length >= options.depth
    if (options.exactDepth === true) {
      logger.debug("exactDepth matching is turned on")
      depthPasses = subdirs.length === options.depth
    }
  }
  logger.silly("isTorrentRenamable", { completePasses, directoryPasses, depthPasses })
  if (!completePasses && directoryPasses && depthPasses) {
    logger.warn("isTorrentRenameable failed", { completePasses, directoryPasses, depthPasses })
  }
  return completePasses && directoryPasses && depthPasses
}

export const MovieTypes = [".mp4", ".wmv", ".avi"]

export const renameTorrent = async (torrent: TorrentArgs, options: CommandArgs) => {
  // logger.debug("torrent.name " + torrent.name)
  let dest = torrent.directory.replace("/" + torrent.name, "").trim()
  if (path.basename(torrent.directory) !== torrent.name) {
    dest = torrent.directory
  }

  if (options.depth > 0) {
    const { destFolder } = getTorrentSubdirs(torrent, options)
    dest = destFolder
  }

  const folder_name = path.basename(dest)
  logger.debug("renameTorrent folder_name: " + folder_name)

  const movieFiles = fs
    .readdirSync(torrent.directory)
    .filter((row) => {
      return (
        path.basename(row).indexOf("sample") < 0 &&
        path.basename(row).indexOf("preview") < 0 &&
        path.basename(row).indexOf("trailer") < 0
      )
    })
    .filter((row) => {
      // only include movie MovieType extensions
      return MovieTypes.indexOf(path.extname(row)) >= 0
    })
    .map((row) => {
      return path.resolve(torrent.directory, row)
    })

  logger.debug("renameTorrent dest: " + dest)
  if (movieFiles.length === 1) {
    const from_file = movieFiles[0]
    // for (const from_file of movieFiles) {
    const filename = path.basename(from_file)
    const ext = path.extname(from_file)
    const to_file = path.join(dest, folder_name + ext)
    logger.debug("renameTorrent to_file: " + to_file)
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
    const nfoFile = path.join(dest, filename + ".rename.nfo")
    fs.writeFileSync(nfoFile, nfoContent)
    return { torrent, action }
    // }
  }
  return {
    torrent,
    reason: "Multiple movie files found, skipped",
  }
}

export const main = async (): Promise<CommandResponse> => {
  const argv = yargs.argv
  logger.silly("raw-arguments", argv)
  const torrent = getTorrentFromArgs(argv)
  const options = getOptionsFromArgs(argv)

  if (isTorrentRenamable(torrent, options)) {
    logger.info("Matched a Torrent!", torrent)
    if (torrent.complete <= 0) {
      logger.warn("Removed match but torrent incomplete!", torrent)
      return { exit_code: 1, message: `Removed match but ${torrent.name} is incomplete` }
    } else {
      return renameTorrent(torrent, options).then((nfo) => {
        return {
          exit_code: 0,
          message: nfo.action ? `${torrent.name} renamed ${torrent.name}` : "skipped",
        }
      })
    }
  } else {
    logger.silly("ignored", argv.name)
    // write nfo log
    const nfoContent = JSON.stringify({ torrent }, null, 2)
    const nfoFile = path.resolve(torrent.directory, torrent.hash + ".rename-ignored.nfo")
    fs.writeFileSync(nfoFile, nfoContent)
    return { exit_code: 0, message: `${torrent.name}` }
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
