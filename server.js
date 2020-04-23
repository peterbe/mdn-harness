const fs = require("fs");
const path = require("path");

const express = require("express");
const expressStaticGzip = require("express-static-gzip");

function main(root, options, logger) {
  const app = express();

  app.use((req, res, next) => {
    // req.url = req.url.toLowerCase();
    // See if it can be turned into a index.html

    if (!req.url.endsWith(".html")) {
      const potentialPath = path.resolve(
        path.join(root, req.url.slice(1) + ".html")
      );
      if (fs.existsSync(potentialPath)) {
        req.url = path.relative(root, potentialPath);
        next();
        return;
      }
    }
    // console.log("MIDDLEARE", req.url);
    next();
  });

  // https://www.npmjs.com/package/express-static-gzip
  app.use("/", expressStaticGzip(root));

  // app.use(
  //   express.static(root, {
  //     // https://expressjs.com/en/4x/api.html#express.static
  //   })
  // );

  app.get("/*", async (req, res) => {
    logger.warn(`Slipped through to catch-all ${req.url}`);
    res.status(404).send(`${req.url} is not a static asset`);
  });

  app.listen(options.port, () =>
    console.log(`Listening on port ${options.port}`)
  );
}

module.exports = {
  serve: main,
};
