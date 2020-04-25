const fs = require("fs");
const path = require("path");

const httpServer = require("http-server");
const minimalcss = require("minimalcss");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { gzip } = require("node-gzip");

async function main(folder, options, logger) {
  logger.info("Running 'inlinecss'");

  const server = httpServer.createServer({ root: folder });
  server.listen(8080);

  const browser = await puppeteer.launch();

  let result;
  try {
    result = await minimalcss.minimize({
      urls: ["http://0.0.0.0:8080/index.html"],
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
  const compressed = await gzip(finalHtml);
  fs.writeFileSync(htmlFile + ".gz", compressed);
}

module.exports = {
  main,
};
