const fs = require("fs");
const path = require("path");

const fetch = require("node-fetch");
const glob = require("glob");

async function main(configfile, options, logger) {
  const config = JSON.parse(fs.readFileSync(configfile));
  const entries = Object.entries(config).filter(([domain, folder]) => {
    if (options.filter && options.filter.length) {
      return options.filter.some(
        (f) => domain.includes(f) || folder.includes(f)
      );
    }
    return true;
  });
  if (!entries.length) {
    throw new Error("No entries left to check");
  }

  function filterFilepath(filepath) {
    if (path.basename(filepath).startsWith("_")) {
      return false;
    }
    return true;
  }

  async function testUrls(urls) {
    const len = urls.length;
    const done = [];
    const promises = urls.map(async (url, i) => {
      const response = await fetch(url);
      const xCache = response.headers.get("x-cache");
      const contentType = response.headers.get("content-type");

      logger.info(
        `${((100 * done.length) / len).toFixed(0).padStart(3)}%  ${url.padEnd(
          100
        )}${response.status} ${xCache.padEnd(10)} (${contentType})`
      );
      done.push(url);
      return { xCache, contentType };
    });
    const values = await Promise.all(promises);
    let hits = 0;
    let misses = 0;
    let attempts = 0;
    for (const value of values) {
      if (value.xCache === "Hit from cloudfront") {
        hits++;
      } else if (value.xCache === "Miss from cloudfront") {
        misses++;
      }
      attempts++;
    }
    console.log(`Hits:   ${((100 * hits) / attempts).toFixed(1)}%`);
    console.log(`Misses: ${((100 * misses) / attempts).toFixed(1)}%`);
  }

  for (const [domain, folder] of entries) {
    const urls = [];
    console.log(`Domain: ${domain} \tFolder: ${folder}`);
    const globOptions = {};
    glob(path.join(folder, "**/*.*"), globOptions, (er, files) => {
      if (er) {
        console.error(er);
        throw er;
      }
      files.filter(filterFilepath).forEach(async (filepath) => {
        const url = `https://${domain}/${path.relative(folder, filepath)}`;
        urls.push(url);
      });
      urls.sort(() => Math.random() - 0.5);
      console.log(`${urls.length} URLs`);

      testUrls(urls.slice(0, options.maxUrls));
    });
  }
  //   logger.info("All done! ✨");
}

module.exports = {
  main,
};
