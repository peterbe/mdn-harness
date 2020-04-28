const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const fetch = require("node-fetch");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const glob = require("glob");
const { gzip } = require("node-gzip");

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

function showFileSize(fp) {
  const { size } = fs.statSync(fp);
  return `${(size / 1024).toFixed(1)}KB`;
}

async function savePayload(payload, resourceUrl, folder, logger) {
  const pathname = new URL(resourceUrl).pathname.slice(1).split("?")[0];
  const destination = path.join(folder, pathname);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, payload);
  logger.info(`Downloaded ${destination} (${showFileSize(destination)})`);
  return destination;
}

async function downloadAssets(url, folder, logger) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  const assetsDownloaded = {};

  page.on("response", async (response) => {
    const responseUrl = response.url();
    const resourceType = response.request().resourceType();

    if (resourceType === "image" && responseUrl.startsWith("data:image/")) {
      // Stylesheets that look like this:
      //
      //   .icon-only-inline i.icon-beaker {
      //     background-image: url(data:image/svg+xml;base64,PHN2ZyBzdHlsZ...
      //
      // These payloads will already be part of the downloaded .css file
      // anyway.
      logger.debug(`Ignoring image: ${responseUrl.slice(0, 100)}`);
      return;
    }
    logger.debug(`${responseUrl}: ${response.status()} (${resourceType})`);
    const payload = await response.buffer();
    assetsDownloaded[responseUrl] = await savePayload(
      payload,
      responseUrl,
      folder,
      logger
    );
  });
  page.on("request", (request) => {
    const skips = [
      "https://www.google-analytics.com",
      "https://cdn.speedcurve.com/",
    ];
    if (
      skips.some((u) => {
        return request.url().startsWith(u);
      })
    ) {
      logger.info(`Skipping URL: ${request.url()}`);
      request.abort();
    } else {
      logger.debug("Noticing request for", request.url());
      request.continue();
    }
  });

  // await page.goto(url, { waitUntil: "load" });
  await page.goto(url, { waitUntil: "networkidle0" });

  const screenshotPath = path.join(folder, "_screenshot.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  logger.info(`Screenshot saved: ${screenshotPath}`);

  browser.close();
  return assetsDownloaded;
}

async function downloadHTML(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} on ${url}`);
  }
  const html = await response.text();
  return html;
}

async function main(url, options, logger) {
  // const pathname = new URL(url).pathname;
  const destination = path.join(
    options.output,
    // pathname.slice(1).replace(/\//g, "_")
    "baseline"
  );
  fs.rmdirSync(destination, { recursive: true });
  logger.info(`Downloading everything into ${destination}`);
  fs.mkdirSync(destination, { recursive: true });
  const html = await downloadHTML(url, destination, logger);
  const assetsDownloaded = await downloadAssets(url, destination, logger);

  function getDownloadedAsset(uri) {
    const absoluteUri = new URL(uri, url).toString();
    const savedPath = assetsDownloaded[absoluteUri];
    if (savedPath) {
      // But got to make it relative to the destination
      return path.relative(destination, savedPath);
    }
    return null;
  }

  const $ = cheerio.load(html);

  // puppeteer doesn't download the favicons, so deal with that manually.
  $('link[rel="shortcut icon"],link[rel="apple-touch-icon-precomposed"]').each(
    async (i, element) => {
      const $element = $(element);
      let uri = $element.attr("href");
      const absoluteUri = new URL(uri, url).toString();
      logger.info(`Download favicon ${absoluteUri}`);
      const response = await fetch(absoluteUri);
      if (!response.ok) {
        throw new Error(
          `Unable to download ${absoluteUri}: ${response.status}`
        );
      }
      const payload = await response.text();
      await savePayload(payload, absoluteUri, destination, logger);
    }
  );

  $("iframe").each((i, element) => {
    const $element = $(element);
    let uri;
    uri = $element.attr("src");
    if (uri) {
      const savedPath = getDownloadedAsset(uri);
      if (savedPath) {
        $element.attr("src", savedPath);
        logger.info(`Changed HTML for ${uri}`);
      }
    }
  });

  const htmlFile = path.join(destination, "index.html");
  fs.writeFileSync(htmlFile, $.html());
  logger.info(`Downloaded ${htmlFile} (${showFileSize(htmlFile)})`);

  const assetsFile = path.join(destination, "_downloaded-assets.json");
  fs.writeFileSync(assetsFile, JSON.stringify(assetsDownloaded, null, 2));
  logger.info(`Record of all downloaded assets in ${assetsFile}`);

  // Create a .gz of each file
  if (options.gzip) {
    const globOptions = {};
    glob(path.join(destination, "**/*.*"), globOptions, (er, files) => {
      if (er) {
        console.error(er);
        throw er;
      }
      files.forEach(async (filepath) => {
        if (filepath.endsWith(".woff2")) return;
        if (path.basename(filepath).startsWith("_")) return;

        const content = fs.readFileSync(filepath);
        const compressed = await gzip(content);
        if (compressed.length < content.length) {
          const newFilepath = filepath + ".gz";
          fs.writeFileSync(newFilepath, compressed);
          logger.debug(
            `Compressed ${filepath} (${showFileSize(
              filepath
            )} -> ${showFileSize(newFilepath)} )`
          );
        } else {
          logger.info(
            `Didn't bother compressing ${filepath} (${showFileSize(filepath)})`
          );
        }
      });
    });
  }

  logger.info("All done! ✨");
}

module.exports = {
  download: main,
};
