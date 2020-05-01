const fs = require("fs");

const keys = JSON.parse(fs.readFileSync("cloudfronts.json"));
console.log(keys);
const summaries = JSON.parse(
  fs.readFileSync("report/lighthouse/summaries.json")
);
const medians = [];
summaries.forEach((summary) => {
  const variant = keys[new URL(summary.url).host].split("/")[1];
  medians.push({
    variant,
    url: summary.url,
    score: summary.detail.performance__median,
  });
});
medians.sort((a, b) => b.score - a.score);

medians.forEach((x) => {
  console.log(`1. - **${x.score * 100}** - [${x.variant}](${x.url})`);
});
