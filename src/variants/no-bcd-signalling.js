const fs = require("fs");
const path = require("path");

// const httpServer = require("http-server");
// const minimalcss = require("minimalcss");
// const puppeteer = require("puppeteer");
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
