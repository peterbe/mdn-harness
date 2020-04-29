/**
 * Extract all the CSS from any <link rel=stylesheet href=foo.css>
 * and run minimalcss on them, combined, and inject that as a
 * big <style> block.
 * And for each <link> tag we did this on set the media to `print`
 * and add `onload="this.media='all'"`
 * BUT, only do this for the HTML inside the iframe.
 */

const fs = require("fs");
const path = require("path");

const httpServer = require("http-server");
const minimalcss = require("minimalcss");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { gzip } = require("node-gzip");

async function main(folder, options, logger) {
  logger.info("Running 'inlinecss-iframe'");

  const server = httpServer.createServer({ root: folder });
  server.listen(8083);

  const browser = await puppeteer.launch();

  let result;
  try {
    result = await minimalcss.minimize({
      urls: ["http://0.0.0.0:8083/pages/js/array-foreach.html"],
      browser,
    });
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    await browser.close();
    server.close();
  }

  const htmlFile = path.join(folder, "pages/js/array-foreach.html");
  const html = fs.readFileSync(htmlFile);
  const $ = cheerio.load(html);

  const stylesheetsFound = Object.keys(result.stylesheetContents)
    .map((u) => new URL(u).pathname)
    .map((u) => path.basename(u));

  $('link[rel="stylesheet"]').each((i, element) => {
    const $element = $(element);
    const href = path.basename($element.attr("href").split("?")[0]);
    if (!$element.attr("media") && stylesheetsFound.includes(href)) {
      $element.attr("media", "print");
      $element.attr("onload", "this.media='all'");
      logger.info(
        `Replaced linked stylesheet ${$element.attr("href")} with inline style`
      );
    }
  });
  $("head").append($("<style>").text(result.finalCss));

  let finalHtml = $.html();
  // Hack around cheerio
  finalHtml = finalHtml.replace(
    /onload="this.media=&apos;all&apos;"/g,
    `onload="this.media='all'"`
  );
  fs.writeFileSync(htmlFile, finalHtml);
  if (fs.existsSync(htmlFile + ".gz")) {
    const compressed = await gzip(finalHtml);
    fs.writeFileSync(htmlFile + ".gz", compressed);
  }
}

module.exports = {
  main,
};
