/**
 * Turn all
 *    background-image:url(data:image/svg+xml;base64,PHN2ZyBzdHlsZT...)
 * into
 *    background-image:url(./path/to/generated.svg)
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const glob = require("glob");

function showSize(size) {
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)}KB`;
  }
  return `${size}B`;
}

async function main(folder, options, logger) {
  logger.info("Running 'ssr-prism'");

  const globOptions = {};

  var regex = /\(data:image\/([a-z\+]+);base64,([a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]+)\)/gi;

  glob(path.join(folder, "**/*.css"), globOptions, (er, files) => {
    if (er) {
      console.error(er);
      throw er;
    }

    files.forEach((filepath) => {
      const css = fs.readFileSync(filepath, "utf-8");
      const savings = [];
      const newCss = css.replace(regex, (match, type, base64data) => {
        if (type === "svg+xml") {
          const buffer = Buffer.from(base64data, "base64");
          const text = buffer.toString("ascii");
          const hasher = crypto.createHash("md5");
          hasher.update(base64data);
          const hash = hasher.digest("hex").slice(0, 9);
          const destination = path.join(folder, "_b64", `${hash}.svg`);
          fs.mkdirSync(path.dirname(destination), { recursive: true });
          fs.writeFileSync(destination, text);

          const { size } = fs.statSync(destination);
          logger.debug(
            `Created ${destination} (${showSize(size)} as file, ${showSize(
              base64data.length
            )} as base64)`
          );
          savings.push({ base64: base64data.length, file: size });
          return `(${path.relative(folder, destination)})`;
        } else {
          throw new Error(`Not implemented ${type}`);
        }
      });
      if (css !== newCss) {
        logger.info(
          `${filepath} changed (${showSize(css.length)} before, ${showSize(
            newCss.length
          )} after)`
        );
        fs.writeFileSync(filepath, newCss);
      }
    });
  });
}

module.exports = {
  main,
};
