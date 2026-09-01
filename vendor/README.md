# Vendored dependencies

These files are third-party code, copied in rather than installed. The application loads them
through the import map in `index.html`, which is what lets the project run with no build step and no
package manager. They are not covered by this repository's `LICENSE`.

| File | Origin | Licence |
| --- | --- | --- |
| `three.module.js` | three.js r160, `build/three.module.js` | MIT, Copyright 2010-2023 Three.js Authors |
| `OrbitControls.js` | three.js r160, `examples/jsm/controls/OrbitControls.js` | MIT, same copyright |

`three.module.js` carries its own `@license` header. `OrbitControls.js` ships without one upstream,
so the notice above stands in for it: it is part of the same distribution and under the same terms.

Neither file has been edited. To confirm that, or to upgrade, fetch the same paths from the
[three.js r160 release](https://github.com/mrdoob/three.js/releases/tag/r160) and compare.

## The three.js licence

```
The MIT License

Copyright © 2010-2023 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial
portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
