const fs = require("fs");
const path = require("path");

const prog = require("caporal");
const ncp = require("ncp").ncp;

const { download } = require("./src/downloader");
const cloudfronts = require("./src/cloudfronts");
const mergesummaries = require("./src/merge-summaries");
const variants = require("./src/variants");

const ALL_VARIANTS = Object.keys(variants);
const DEFAULT_DOWNLOADED_FOLDER = "variants";

prog
  .version("1.0.0")
  .command("download", "Download a whole webpage")
  .argument("<url>", "URL to download")
  .option(
    "--output <folder>",
    "Folder to put variants",
    prog.PATH,
    DEFAULT_DOWNLOADED_FOLDER
  )
  .option("--gzip", "Created .gz for each file downloaded", prog.BOOL, false)
  .action(async function (args, options, logger) {
    download(args.url, options, logger);
  })

  .command("generate-variants", "Static serve a whole directory")
  .argument("<base>", "Base folder to clone and change")
  .argument("[variant...]", "Variant(s) to run", prog.ARRAY, ALL_VARIANTS)
  .action(async function (args, options, logger) {
    const variantsList = args.variant.length ? args.variant : ALL_VARIANTS;
    if (variantsList.some((name) => !ALL_VARIANTS.includes(name))) {
      const trouble = variantsList.find((name) => !ALL_VARIANTS.includes(name));
      throw new Error(`${trouble} is not a recognized variant`);
    }
    if (!variantsList.length) {
      throw new Error("No variants selected!");
    }
    for (const variantName of variantsList) {
      const clonePath = path.join(path.dirname(args.base), variantName);
      logger.info(`Cloning ${args.base} to ${clonePath}`);
      fs.rmdirSync(clonePath, { recursive: true });
      // XXX consider ncp.limit if it's important
      // https://www.npmjs.com/package/ncp
      ncp(args.base, clonePath, async (err) => {
        if (err) {
          console.error(err);
          throw err;
        }
        const func = variants[variantName].main;
        await func(clonePath, options, logger);
      });
    }
  })

  .command("check-cloudfronts", "Make sure the assets are loading")
  .argument(
    "[configfile]",
    "JSON config file mapping domain to folder",
    prog.PATH,
    "cloudfronts.json"
  )
  .option("--filter <string>", "Filters to search", prog.ARRAY, [])
  .option("--max-urls <number>", "Max. URLs to check per domain", prog.INT, 100)
  .action(async function (args, options, logger) {
    cloudfronts.main(args.configfile, options, logger);
  })

  .command(
    "merge-summaries",
    "Take one lighthouse summary and make it multiple"
  )
  .argument(
    "[summaryfile]",
    "JSON summary file made from lighthouse",
    prog.PATH,
    "report/lighthouse/summary.json"
  )
  .action(async function (args, options, logger) {
    mergesummaries.main(args.summaryfile, options, logger);
  });

prog.parse(process.argv);
