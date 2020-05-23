import temp from "temp"
import fs from "fs"
import path from "path"
import { logger as makeLogger } from "./logger"

describe.skip("logger", () => {
  beforeAll(() => {
    temp.track()
    jest.unmock("yargs")
    process.env.RTSCRIPT_LOGS = tempFile
  })
  const tempFolder = temp.mkdirSync({ prefix: "rtscripts-logger-testing" })
  const tempFile = path.join(tempFolder, "test.log")
  const logger = makeLogger()
  it("writes to --output defined", async () => {
    logger.warn("warn", { tempFile })
    logger.error("error", { tempFile })
    logger.debug("debug", { tempFile })
    logger.silly("silly", { tempFile })
    console.log("[TEST] tempFile", tempFile)
    expect(fs.existsSync(tempFile)).toBeTruthy()
  })
})
