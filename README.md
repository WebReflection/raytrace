# raytrace

A comparison between [original raytrace.ts](https://github.com/Microsoft/TypeScriptSamples/tree/master/raytracer) performance VS a hand-written [JS port](./rt.vanilla.js).

**Live Test** - both pages show render time in console

  * original [**TypeScript**](https://webreflection.github.io/raytrace/raytracer.html) targeting *ES2022* code
  * hand-written [**JavaScript**](https://webreflection.github.io/raytrace/rt.vanilla.html)

## Licence ##

The [original TypeScript version](https://github.com/Microsoft/TypeScriptSamples/issues/143) and this JS translation are licenced under the Apache-2.0 licence.

### How to test locally

  * fork or clone this repo
  * enter `raytrace` directory (`cd raytrace`)
  * `npm i`
  * `npm run build`
  * run any local server to test `raytracer.html` or `rt.vanilla.html` on your localhost

### Could the vanilla version have TS too?

Check the [JSDoc TS](https://github.com/WebReflection/raytrace/blob/jsdoc-ts/rt.vanilla.js) annotated file which is fully compliant with TS and it still performs as good as the not-annotated file.
