import winston from "winston";
import { DateTime } from "luxon";
import * as path from "path";

const homedir = require("os").homedir();

const argv = require("yargs").options("output", {
  description: "file to log into",
  default: path.join(
    homedir,
    "Library/Logs",
    "rtorrent.command.rename-on-removed.log"
  ),
}).argv;

const filename = argv.output;

export const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint(),
    winston.format.printf((input) => {
      const { timestamp, level, message, ...extra } = input;
      const { name, complete, basePath, ...data } = extra;
      const date = DateTime.fromISO(timestamp);

      const parts = [
        `[${date.toLocaleString(DateTime.DATETIME_MED)}]`,
        `(${level}):`,
        message,
      ];
      if (name) {
        parts.push(`torrent:name:${name}`);
      }
      if (!isNaN(complete)) {
        parts.push(`torrent:complete:${complete}`);
      }
      if (level != "info") {
        parts.push(JSON.stringify(data));
      }
      return parts.join(" ");
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename,
    }),
  ],
});

export default logger;
