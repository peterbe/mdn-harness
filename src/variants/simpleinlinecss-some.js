/**
 * Extract all the CSS from any <link rel=stylesheet href=foo.css>,
 * except the big react-mdn.{hash}.css bundle, and just turn them into
 * simple inline blocks.
 */

const fs = require("fs");
const path = require("path");

const cheerio = require("cheerio");
const { gzip } = require("node-gzip");

async function main(folder, options, logger) {
  logger.info("Running 'simpleinlinecss-some'");

  const htmlFile = path.join(folder, "index.html");
  const html = fs.readFileSync(htmlFile);
  const $ = cheerio.load(html);

  $('link[rel="stylesheet"]').each((i, element) => {
    const $element = $(element);
    const href = $element.attr("href");
    if (!href.includes("react-mdn") && !href.includes("print")) {
      const css = fs.readFileSync(
        path.join(folder, href.slice(0, href.length))
      );
      $element.replaceWith($("<style>").attr("type", "text/css").text(css));
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
