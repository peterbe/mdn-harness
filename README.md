# Web Performance Test Harness

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

## Variants

A variant is an optimization attempt. E.g. "Replace all SVGs with WebP".
You generate them all my running `node index.js generate-variants ...`.

Variants are Node functions that clones a complete folder and applies
some optimization changes. Each variant is a function in a file each.
The all have to be registered in the `variants/index.js` file as
`module.exports`.

```bash
node --unhandled-rejections=strict index.js generate-variants downloaded/en-US_docs_Web_JavaScript_Reference_Global_Objects_Array_forEach
```
