/**
 * Extract all the CSS from any <link rel=stylesheet href=foo.css>
 * and run minimalcss on them, combined, and inject that as a
 * big <style> block.
 * But also, delete all the <link> tags which we were able to do this on.
 */

const fs = require("fs");
const path = require("path");

const httpServer = require("http-server");
const minimalcss = require("minimalcss");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { gzip } = require("node-gzip");

async function main(folder, options, logger) {
  logger.info("Running 'inlinecss-extreme'");

  const server = httpServer.createServer({ root: folder });
  server.listen(8090);

  const browser = await puppeteer.launch();

  let result;
  try {
    result = await minimalcss.minimize({
      urls: ["http://0.0.0.0:8090/index.html"],
      browser,
    });
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    await browser.close();
    server.close();
  }

  const htmlFile = path.join(folder, "index.html");
  const html = fs.readFileSync(htmlFile);
  const $ = cheerio.load(html);

  const stylesheetsFound = Object.keys(result.stylesheetContents).map(
    (u) => new URL(u).pathname
  );

  $('link[rel="stylesheet"]').each((i, element) => {
    const $element = $(element);
    if (
      !$element.attr("media") &&
      stylesheetsFound.includes($element.attr("href"))
    ) {
      $element.remove();
      logger.info(`Remove linked stylesheet ${$element.attr("href")}`);
    }
  });
  $("head").append($("<style>").text(result.finalCss));

  let finalHtml = $.html();
  fs.writeFileSync(htmlFile, finalHtml);
  const compressed = await gzip(finalHtml);
  fs.writeFileSync(htmlFile + ".gz", compressed);
}

module.exports = {
  main,
};
