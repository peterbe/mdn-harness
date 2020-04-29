# Web Performance Test Harness

A CLI to run web performance testing of MDN pages.

## License

MPL-2.0

## Download

Example use:

```bash
yarn run download https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
```

That should download files in `downloaded/*`

## Server

Example use:

```bash
nodemon --unhandled-rejections=strict index.js serve variants/baseline
```

## Variants

A variant is an optimization attempt. E.g. "Replace all SVGs with WebP".
You generate them all my running `node index.js generate-variants ...`.

Variants are Node functions that clones a complete folder and applies
some optimization changes. Each variant is a function in a file each.
The all have to be registered in the `variants/index.js` file as
`module.exports`.

```bash
yarn run generate-variants variants/baseline
```

## Lighthouse report

Pure `lighthouse`:

```bash
lighthouse https://harness.local --preset perf --throttling.cpuSlowdownMultiplier=6 --chrome-flags="--headless"
```

Or, using `lighthouse-batch`:

```bash
lighthouse-batch -f sites.txt --html --params "--only-categories=performance --preset perf --throttling.cpuSlowdownMultiplier=6"
```

then `open report/lighthouse/inlinecss_harness_local.report.html`
or:

```bash
cat report/lighthouse/summary.json | jq
```

### Tip: Checking your sites .txt file

To make sure that every URL in your .txt file works you can use:

```bash
cat cloudfront-sites.txt | xargs curl -I
```

## S3 uploading

Standing in the root directory:

```bash
s3cmd put --acl-public --recursive --no-mime-magic --guess-mime-type variants s3://peterbe-mdn-harness/
```

## Current variants

This isn't really part of the source code but here's a list of
AWS CloudFront instances set up for the current variants it can generate:

* [baseline](https://d2fm08353pu8pw.cloudfront.net/index.html)
* [inlinecss](https://d2um11o9s382bw.cloudfront.net/index.html)
* [nobcdsignalling](https://d3ohduisxjll24.cloudfront.net/index.html)
* [ssrprism](https://d1ca36dt8e8ima.cloudfront.net/index.html)
* [inlinecssextreme](https://d1jqaxyu5i06vi.cloudfront.net/index.html)
* [lazyloadiframe](https://dzyoyiq5bbseg.cloudfront.net/index.html)
* [noreact](https://d1cap84gly6pqw.cloudfront.net/index.html)
