/**
 * Remove the JS bundle for main react and bcd signalling
 * I.e. /static/build/js/react-bcd-signal.{hash}.js and
 * and /static/build/js/react-main.{hash}.js
 */

const fs = require("fs");
const path = require("path");

const cheerio = require("cheerio");
const { gzip } = require("node-gzip");

async function main(folder, options, logger) {
  logger.info("Running 'no-react'");

  const htmlFile = path.join(folder, "index.html");
  const html = fs.readFileSync(htmlFile);
  const $ = cheerio.load(html);

  $("script").each((i, element) => {
    const $element = $(element);
    let uri = $element.attr("src");
    if (
      uri &&
      (uri.includes("react-main") || uri.includes("react-bcd-signal"))
    ) {
      logger.info(`Removing React bundle URI ${uri}`);
      $element.remove();
    }
  });

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
