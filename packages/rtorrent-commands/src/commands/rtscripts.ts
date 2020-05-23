import Arguments from "yargs"
import RenameOnRemove from "./rename-on-remove"
export const Functions = [RenameOnRemove]

export const yargs = Arguments.option("verbose", {
  type: "boolean",
  default: false,
})
  .option("directory", {
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

function main() {
  return Promise.all(Functions.map((func) => func()))
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
