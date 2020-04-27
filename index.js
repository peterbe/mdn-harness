const path = require("path");

const prog = require("caporal");
const ncp = require("ncp").ncp;

const { download } = require("./src/downloader");
const { serve } = require("./src/server");
const variants = require("./src/variants");

const ALL_VARIANTS = Object.keys(variants);
const DEFAULT_DOWNLOADED_FOLDER = "variants";
const DEFAULT_SERVER_PORT = 5000;

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

    for (const variantName of variantsList) {
      // const cloneName = `${args.base}__${variantName}`;
      const cloneName = path.join(path.dirname(args.base), variantName);
      logger.info(`Cloning ${args.base} to ${cloneName}`);
      // XXX consider ncp.limit if it's important
      // https://www.npmjs.com/package/ncp
      ncp(args.base, cloneName, async (err) => {
        if (err) {
          console.error(err);
          throw err;
        }
        // console.log({ variant });
        const func = variants[variantName].main;
        await func(cloneName, options, logger);
      });
    }
    // serve(args.root, options, logger);
  });

prog.parse(process.argv);
