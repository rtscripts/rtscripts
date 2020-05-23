import winston from "winston"
import { DateTime } from "luxon"
import * as path from "path"
import Arguments from "yargs"

export const logger = () => {
  const homedir = require("os").homedir()

  // console.log(process.argv)
  const argv = Arguments.option("output", {
    description: "file to log into [env: RTORRENT_LOGS]",
    default: path.join(homedir, "Library/Logs", "rtorrent.commands.log"),
  }).argv

  const filename = process.env.RTSCRIPT_LOGS ? process.env.RTSCRIPT_LOGS : argv.output
  console.log("[LOGGER]", filename)

  return winston.createLogger({
    level: "debug",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.prettyPrint(),
      winston.format.printf((input) => {
        const { timestamp, level, message, ...extra } = input
        const { name, complete, basePath, ...data } = extra
        const date = DateTime.fromISO(timestamp)

        const parts = [`[${date.toLocaleString(DateTime.DATETIME_MED)}]`, `(${level}):`, message]
        if (name) {
          parts.push(`torrent:name:${name}`)
        }
        if (!isNaN(complete)) {
          parts.push(`torrent:complete:${complete}`)
        }
        if (level != "info") {
          parts.push(JSON.stringify(data))
        }
        return parts.join(" ")
      })
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename,
      }),
    ],
  })
}

// export const logger = makeLogger()

export default logger
