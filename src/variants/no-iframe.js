/**
 * Delete the whole Interactive Example iframe.
 */

const fs = require("fs");
const path = require("path");

const cheerio = require("cheerio");
const { gzip } = require("node-gzip");

async function main(folder, options, logger) {
  logger.info("Running 'no-iframe'");

  const htmlFile = path.join(folder, "index.html");
  const html = fs.readFileSync(htmlFile);
  const $ = cheerio.load(html);

  $("iframe").remove();

  let finalHtml = $.html();
  fs.writeFileSync(htmlFile, finalHtml);
  if (fs.existsSync(htmlFile + ".gz")) {
    const compressed = await gzip(finalHtml);
    fs.writeFileSync(htmlFile + ".gz", compressed);
  }
}

module.exports = {
  main,
};
