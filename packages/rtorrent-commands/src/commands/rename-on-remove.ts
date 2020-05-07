#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";

export const DIRECTORY_MATCH = /How to/i;
export const NFO_NAME = "original.json";

const yargs = require("yargs")
  .option("directory", {
    required: true,
    type: "string",
    description: "folder containing torrent",
  })
  .option("basePath", {
    required: true,
    type: "string",
    description: "path to torrent files",
  })
  .option("complete", {
    type: "number",
    description: "has torrent completed",
  });

import logger from "../logger";

export interface TorrentArgs {
  // required
  directory: string;
  basePath: string;
  complete: number;
  // optional
  name?: string;
  hash?: string;
  tiedToFile?: number;
  isMultiFile?: number;
  // unused
  // sessionPath: string;
  // hashing: number;
}

export const getTorrentFromArgs = (args: any): TorrentArgs => {
  const torrent = {
    name: args.name,
    directory: args.directory,
    basePath: args.basePath,
    complete: args.complete,
    hash: args.hash,
    // sessionPath: args.sessionPath,
    // hashing: args.hashing,
    tiedToFile: args.tiedToFile,
    isMultiFile: args.isMultiFile,
  };
  return torrent;
};

export const isTorrentRenamable = (torrent: TorrentArgs): boolean => {
  const complete =
    typeof torrent.complete !== "undefined" ? torrent.complete >= 1 : true;
  return DIRECTORY_MATCH.test(torrent.basePath) && complete;
};

export const MovieTypes = [".mp4", ".wmv", ".avi"];

export const getMoviesInFolder = (folder: string) => {
  const files = fs.readdirSync(folder);
  return (
    files
      // ignore trailers, clips, sample etc
      .filter((row) => {
        return (
          path.basename(row).indexOf("sample") < 0 &&
          path.basename(row).indexOf("preview") < 0 &&
          path.basename(row).indexOf("trailer") < 0
        );
      })
      .filter((row) => {
        // console.log("ext", path.extname(row));
        return MovieTypes.indexOf(path.extname(row)) >= 0;
      })
      .map((row) => {
        return path.resolve(folder, row);
      })
  );
};

export const renameTorrent = async (torrent: TorrentArgs) => {
  const parentFolder = path.basename(torrent.directory);
  logger.debug("Reading folder:", `'${parentFolder}'`);
  const movieFiles = getMoviesInFolder(torrent.directory);
  logger.debug("Found Movies:", `${movieFiles}`);
  logger.info("Rename using", parentFolder);
  if (movieFiles.length === 1) {
    for (const from_file of movieFiles) {
      const filename = path.basename(from_file);
      const ext = path.extname(from_file);
      const to_file = from_file.replace(filename, parentFolder + ext);
      const action = {
        from_file,
        to_file,
        filename,
        ext,
        date: new Date().toISOString(),
      };
      fs.renameSync(from_file, to_file);
      // write nfo log
      const nfoContent = JSON.stringify({ torrent, action }, null, 2);
      const nfoFile = path.resolve(torrent.directory, filename + ".rename.nfo");
      fs.writeFileSync(nfoFile, nfoContent);
    }
  }
};

export const main = () => {
  const argv = yargs.argv;
  logger.debug("raw-arguments", argv);
  const torrent = getTorrentFromArgs(argv);

  if (isTorrentRenamable(torrent)) {
    logger.info("Matched a Torrent!", torrent);
    if (torrent.complete <= 0) {
      logger.warn("Removed match but torrent incomplete!", torrent);
    } else {
      return renameTorrent(torrent);
    }
  } else {
    logger.silly("ignored", argv.name);
  }
};

if (require.main === module) {
  main()
    ?.then(() => {
      process.exit(0);
    })
    .catch((err) => {
      process.exit(err);
    });
}

export default main;
