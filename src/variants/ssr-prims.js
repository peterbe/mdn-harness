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

function getPrismPluginName(classList) {
  for (let cls of classList) {
    if (/language-\w+/.test(cls)) {
      const name = cls.replace(/^language-/, "").trim();
      if (Prism.languages[name]) {
        return name;
      } else {
        // console.warn(
        //   `Looks like a syntax highlighting marker but not found as a Prism plugin: ${name}`
        // );
      }
    }
  }
  // No good match
  return null;
}

async function main(folder, options, logger) {
  logger.info("Running 'ssr-prism'");

  const htmlFile = path.join(folder, "index.html");
  const html = fs.readFileSync(htmlFile);
  const $ = cheerio.load(html);

  $("pre > code").each((i, element) => {
    const $element = $(element);
    console.log($element.attr("class"));
  });

  let finalHtml = $.html();
  fs.writeFileSync(htmlFile, finalHtml);
  const compressed = await gzip(finalHtml);
  fs.writeFileSync(htmlFile + ".gz", compressed);
}

module.exports = {
  main,
};
