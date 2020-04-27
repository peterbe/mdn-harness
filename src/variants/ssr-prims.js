/**
 * Extract all code snippets and run Prism on them and inject the resulting
 * highlighted code into <pre> tags so that the prism inside the main bundle
 * doesn't need to do anything.
 */

const fs = require("fs");
const path = require("path");

const cheerio = require("cheerio");
const Prism = require("prismjs");
const { gzip } = require("node-gzip");

async function main(folder, options, logger) {
  logger.info("Running 'ssr-prism'");

  const htmlFile = path.join(folder, "index.html");
  const html = fs.readFileSync(htmlFile);
  const $ = cheerio.load(html);

  $("pre").each((i, element) => {
    const $element = $(element);
    let uri = $element.attr("src");
    if (uri && uri.includes("bcd-signal")) {
      console.log(uri);
      $element.remove();
    }
  });

  let finalHtml = $.html();
  fs.writeFileSync(htmlFile, finalHtml);
  const compressed = await gzip(finalHtml);
  fs.writeFileSync(htmlFile + ".gz", compressed);
}

module.exports = {
  main,
};
