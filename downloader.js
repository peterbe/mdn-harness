const fs = require("fs");
const path = require("path");
// const url_package = require("url");
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

  //const title = await page.title();
  //console.log(title);
  const screenshotPath = path.join(folder, "screenshot.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  logger.info(`Screenshot saved: ${screenshotPath}`);
  // const html = await page.content();
  // console.log(html);

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
  const pathname = new URL(url).pathname;
  const destination = path.join(
    options.output,
    pathname.slice(1).replace(/\//g, "_")
  );
  fs.rmdirSync(destination, { recursive: true });
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

  function fixCSS(css) {
    function replacer(match, uri) {
      if (uri.startsWith("data:image")) return match;

      if (match.includes("dino-happy")) {
        console.log("WHAT!!!!", match, uri);
      }

      const absoluteUri = new URL(uri, url).toString();
      const savedPath = assetsDownloaded[absoluteUri];
      if (match.includes("dino-happy")) {
        console.log({ savedPath }, "FIXED:", match.replace(uri, savedPath));
      }
      if (savedPath) {
        logger.info(
          `Fixed CSS URL ${uri} (in ${match}) BECAME ${match.replace(
            uri,
            savedPath
          )}`
        );
        // return match;
        return match.replace(uri, savedPath);
      }
      logger.info(`BAIL on CSS URL ${uri} (in ${match})`);
      return match;
    }
    return css.replace(/url\(["']?(.*?)["']?\)/g, replacer);
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

  // $("script,link,img,iframe").each((i, element) => {
  //   const $element = $(element);
  //   let uri;
  //   if (
  //     element.tagName === "script" ||
  //     element.tagName === "image" ||
  //     element.tagName === "iframe"
  //   ) {
  //     uri = $element.attr("src");
  //     if (uri) {
  //       const savedPath = getDownloadedAsset(uri);
  //       if (savedPath) {
  //         $element.attr("src", savedPath);
  //         logger.info(`Changed HTML for ${uri}`);
  //       }
  //     }
  //   } else if (element.tagName === "link") {
  //     uri = $element.attr("href");
  //     if (uri) {
  //       const savedPath = getDownloadedAsset(uri);
  //       if (savedPath) {
  //         $element.attr("href", savedPath);
  //         logger.info(`Changed HTML for ${uri}`);
  //       }
  //     }
  //   } else {
  //     throw new Error(`DON'T KNOW HOW TO DEAL WITH '${element.tagName}'!`);
  //   }
  // });
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

  // $("style").each((i, element) => {
  //   // Need to fix all inline stylesheets that might look something
  //   // like this:
  //   //
  //   //    @font-face {
  //   //      font-family: zillaslab;
  //   //      font-display: swap;
  //   //      src: url(/static/fonts/locales/ZillaSlab-Regular.subset.bbc33fb47cf6.woff2) format('woff2'),
  //   //           url(/static/fonts/locales/ZillaSlab-Regular.subset.0357f12613a7.woff) format('woff');
  //   //
  //   const $element = $(element);
  //   const initialCss = $element.text();
  //   const fixedCss = fixCSS(initialCss);
  //   if (fixedCss !== initialCss) {
  //     console.log("CSS BEFORE_______________________________________");
  //     console.log(initialCss);
  //     console.log("CSS AFTER_______________________________________");
  //     console.log(fixedCss);
  //     console.log("\n");
  //     $element.text(fixedCss);
  //   }
  // });
  const htmlFile = path.join(destination, "index.html");
  fs.writeFileSync(htmlFile, $.html());
  logger.info(`Downloaded ${htmlFile} (${showFileSize(htmlFile)})`);

  const assetsFile = path.join(destination, "_downloaded-assets.json");
  fs.writeFileSync(assetsFile, JSON.stringify(assetsDownloaded, null, 2));
  logger.info(`Record of all downloaded assets in ${assetsFile}`);

  // Object.values(assetsDownloaded)
  //   .filter((v) => path.basename(v).endsWith(".css"))
  //   .forEach((cssFile) => {
  //     const initialCss = fs.readFileSync(cssFile, "utf8");
  //     const fixedCss = fixCSS(initialCss);
  //     if (fixedCss !== initialCss) {
  //       logger.info(`Fixed some local url(...) reference in ${cssFile}`);
  //       fs.writeFileSync(cssFile, fixedCss);
  //     }
  //   });

  // Create a .gz of each file
  const globOptions = {};
  glob(path.join(destination, "**/*.*"), globOptions, (er, files) => {
    if (er) {
      console.error(er);
      throw er;
    }
    files.forEach(async (filepath) => {
      if (filepath.endsWith(".woff2")) return;

      const content = fs.readFileSync(filepath);
      const compressed = await gzip(content);
      if (compressed.length < content.length) {
        const newFilepath = filepath + ".gz";
        fs.writeFileSync(newFilepath, compressed);
        logger.debug(
          `Compressed ${filepath} (${showFileSize(filepath)} -> ${showFileSize(
            newFilepath
          )} )`
        );
      } else {
        logger.info(
          `Didn't bother compressing ${filepath} (${showFileSize(filepath)})`
        );
      }
    });
  });

  logger.info("All done! ✨");
}

module.exports = {
  download: main,
};
