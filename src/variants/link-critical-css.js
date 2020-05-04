/**
 * Extract all the CSS from any <link rel=stylesheet href=*.css>
 * and run minimalcss on them, combined, and put back as
 * a <link rel=stylesheet href=_critical.css>.
 * And for each <link> tag we did this on set the media to `print`
 * and add `onload="this.media='all'"`
 */

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
  server.listen(8085);

  const browser = await puppeteer.launch();

  let result;
  try {
    result = await minimalcss.minimize({
      urls: ["http://0.0.0.0:8085/index.html"],
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

  const criticalCssFile = path.join(folder, "critical.css");
  fs.writeFileSync(criticalCssFile, result.finalCss);
  const link = $("<link>")
    .attr("rel", "stylesheet")
    .attr("type", "text/css")
    .attr("href", "critical.css");
  $("head").append(link);

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
