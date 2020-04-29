const fs = require("fs");
const path = require("path");

const fetch = require("node-fetch");
const glob = require("glob");

async function main(configfile, options, logger) {
  const config = JSON.parse(fs.readFileSync(configfile, "utf-8"));
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

  async function testUrls(allUrls, limit, done) {
    if (limit > allUrls.length) {
      console.warn(`No point limiting. There are only ${allUrls.length} URLs`);
    }
    const urls = allUrls.slice(0, limit);
    const len = urls.length;
    const run = [];
    const promises = urls.map(async (url, i) => {
      const response = await fetch(url);
      const xCache = response.headers.get("x-cache");
      const contentType = response.headers.get("content-type");

      logger.info(
        `${((100 * (run.length + 1)) / len)
          .toFixed(0)
          .padStart(3)}%  ${url.padEnd(110)}${response.status} ${xCache.padEnd(
          10
        )} (${contentType})`
      );
      run.push(url);
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
    console.log("");
    done(hits / attempts);
  }

  function testDomain(domain, folder, done) {
    console.log(`Domain: ${domain} \tFolder: ${folder}`);
    const globOptions = {};
    const urls = [];
    glob(path.join(folder, "**/*.*"), globOptions, (er, files) => {
      if (er) {
        console.error(er);
        throw er;
      }
      files.filter(filterFilepath).forEach((filepath) => {
        const url = `https://${domain}/${path.relative(folder, filepath)}`;
        urls.push(url);
      });
      urls.sort(() => Math.random() - 0.5);
      testUrls(urls, options.maxUrls, done);
    });
  }

  let allHitRatios = [];
  function recurse() {
    let next = entries.pop();
    if (!next) {
      console.log("ALL DONE!");
      const average =
        allHitRatios.reduce((a, b) => a + b, 0) / allHitRatios.length;
      console.log(`  average hit ratio: ${(100 * average).toFixed(1)}%`);
      return;
    }
    const [domain, folder] = next;
    testDomain(domain, folder, (hitRatio) => {
      allHitRatios.push(hitRatio);
      recurse();
    });
  }
  recurse();
}

module.exports = {
  main,
};
