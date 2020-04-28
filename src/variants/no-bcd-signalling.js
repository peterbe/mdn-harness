const fs = require("fs");
const path = require("path");

const cheerio = require("cheerio");
const { gzip } = require("node-gzip");

async function main(folder, options, logger) {
  logger.info("Running 'no-bcd-signalling'");

  const htmlFile = path.join(folder, "index.html");
  const html = fs.readFileSync(htmlFile);
  const $ = cheerio.load(html);

  $("script").each((i, element) => {
    const $element = $(element);
    let uri = $element.attr("src");
    if (uri && uri.includes("bcd-signal")) {
      logger.info(`Removing BCD Signalling URI ${uri}`);
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
