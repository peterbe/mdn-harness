# MDN web perf test harness

A CLI to run web performance testing of MDN pages.

## License

MPL-2.0


## Download

Example use:

```bash
node --unhandled-rejections=strict index.js download https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
```

That should download files in `downloaded/*`

## Server

Example use:

```bash
nodemon --unhandled-rejections=strict index.js serve downloaded/en-US_docs_Web_JavaScript_Reference_Global_Objects_Array_forEach
```
