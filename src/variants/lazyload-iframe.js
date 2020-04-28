const fs = require("fs");
const path = require("path");

const cheerio = require("cheerio");
const httpServer = require("http-server");
const puppeteer = require("puppeteer");
const { gzip } = require("node-gzip");

const hackyJSCode = `
window.onload=function() {
    let options = {
        root: document.querySelector('#wikiArticle'),
        rootMargin: '0px',
        threshold: 1.0
    }

    let once = false;
    let target = document.querySelector('#iframe-placeholder');
    let observer = new IntersectionObserver(event => {
        if (!once) {
            once = true;
            // console.log('OBSERVED', event, target);
            let iframe = document.createElement('iframe');
            Object.entries(JSON.parse(target.dataset.iframeattrs)).forEach(([key, value]) => {
                iframe.setAttribute(key, value);
            });
            target.parentNode.replaceChild(iframe, target);
        }
    }, options);
    observer.observe(target);
}

`;

async function main(folder, options, logger) {
  logger.info("Running 'lazyload-iframe'");

  const server = httpServer.createServer({ root: folder });
  server.listen(8082);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const savePath = path.join(folder, "iframe.png");

  let boundingbox;
  try {
    await page.setViewport({ width: 1200, height: 1000, deviceScaleFactor: 1 });
    await page.goto("http://0.0.0.0:8082/index.html");
    const el = await page.$("iframe");
    boundingbox = await el.boundingBox();
    await el.screenshot({ path: savePath });
    logger.info(`Created iframe screenshot ${savePath}`);
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

  $("iframe").each((i, element) => {
    const $element = $(element);

    $("<img>")
      .attr("src", path.relative(folder, savePath))
      .attr("id", "iframe-placeholder")
      .attr("alt", "screenshot")
      .attr("width", boundingbox.width)
      .attr("height", boundingbox.height)
      .attr("data-iframeattrs", JSON.stringify(element.attribs))
      .attr("title", "This is a placeholder whilst we wait for iframe")
      .insertBefore(element);
    $element.remove();
    logger.info("Replaced iframe with an image");
  });

  $("<script>").text(hackyJSCode).appendTo($("body"));

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
