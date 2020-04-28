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

  const aliases = {
    js: "javascript",
  };

  $("pre").each((i, element) => {
    const $element = $(element);
    const cls = $element.attr("class");

    for (const match of cls.matchAll(/brush:\s*(.*)/)) {
      const brushName = aliases[match[1]] || match[1];

      if (Prism.languages[brushName]) {
        const code = $element.text();
        const highlightedHTML = Prism.highlight(
          code,
          Prism.languages[brushName],
          brushName
          // XXX this needs line numbers maybe
        );
        $element.html(highlightedHTML);
        $element.attr("class", `line-numbers language-${match[1]}`);
      }
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
