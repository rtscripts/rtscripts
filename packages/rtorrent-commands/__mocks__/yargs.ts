import * as path from "path";
const homedir = require("os").homedir();

const output = path.join(
  homedir,
  "Library/Logs",
  "rtorrent.command.rename-on-removed.log"
);

class Yargs {
  option = () => {
    return this;
  };

  argv = {
    _: [],
    "default-directory": "/Volumes/Storage/Downloads",
    defaultDirectory: "/Volumes/Storage/Downloads",
    "session-path": "/example/rtorrent/.rtorrent.session/",
    sessionPath: "/example/rtorrent/.rtorrent.session/",
    hash: "A".repeat(40),
    hashing: 0,
    "hashing-failed": 1,
    hashingFailed: 1,
    name: "example.2020.01.02.file.name.mp4",
    directory: "/Volumes/Storage/Some Example/Path",
    "base-path":
      "/Volumes/Storage/Some Example/Path/example.2020.01.02.file.name.mp4",
    basePath:
      "/Volumes/Storage/Some Example/Path/example.2020.01.02.file.name.mp4",
    "tied-to-file": "",
    tiedToFile: "",
    "is-multi-file": 0,
    isMultiFile: 0,
    complete: 1,
    $0: "Path/to/rename-removed.js",
    output,
  };
}

export const yargs = new Yargs();

export default yargs;
