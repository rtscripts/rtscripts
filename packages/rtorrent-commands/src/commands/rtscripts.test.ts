import rtscripts from "./rtscripts"
import { testTorrentFactory } from "./test-helpers"
import temp from "temp"

import { logger as makeLogger } from "../logger"

describe("rtscripts", () => {
  jest.mock("yargs")
  const logger = makeLogger()
  console.log = jest.fn()
  logger.level = "critical"
  const tempFolders: string[] = []
  const testTorrent = testTorrentFactory(tempFolders)
  afterEach(() => {
    if (tempFolders.length > 0) {
      temp.cleanupSync()
    }
  })
  it("can run all commands", async () => {
    testTorrent()
    expect(await rtscripts()).toBeTruthy()
  })
})
