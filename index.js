const prog = require("caporal");
const { download } = require("./downloader");
const { serve } = require("./server");

const DEFAULT_DOWNLOADED_FOLDER = "downloaded";
const DEFAULT_SERVER_PORT = 5000;

prog
  .version("1.0.0")
  .command("download", "Download a whole webpage")
  .argument("<url>", "URL to download")
  .option(
    "--output <folder>",
    "Folder to put downloads",
    prog.PATH,
    DEFAULT_DOWNLOADED_FOLDER
  )
  .action(async function (args, options, logger) {
    // console.log(args);
    // console.log(options);
    download(args.url, options, logger);
  })

  .command("serve", "Static serve a whole directory")
  .argument("<root>", "Root folder")
  .option(
    "--port <number>",
    "Folder to put downloads",
    prog.INTEGER,
    DEFAULT_SERVER_PORT
  )

  .action(async function (args, options, logger) {
    serve(args.root, options, logger);
  });

prog.parse(process.argv);
