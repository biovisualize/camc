# CAMC

Interactive viewer for Constant Anisotropic Mean Curvature surfaces.

## What it shows

A CAMC surface is swept from two [Gielis superformula](https://en.wikipedia.org/wiki/Superformula)
profiles. Profile A sets how the radius and the height evolve along the sweep; profile B sets the
cross-section. Each profile has four parameters, and all eight are live.

For a profile with parameters `m, n1, n2, n3`:

    r(t) = ( |cos(m·t/4)|^n2 + |sin(m·t/4)|^n3 ) ^ (-1/n1)

The surface is `( f(s)·x_B(t), f(s)·y_B(t), g(s) )`, where `f(s) = 1/y_A(s)` and the height is a
definite integral evaluated by 32-point Gauss–Legendre quadrature:

    g(s) = ∫ from 0.2 to s of v'(w)·f'(w) dw

Non-integer `m` is where the interesting shapes live: `|cos(m·t/4)|` then completes a fractional
number of periods over one turn, the cross-section fails to close on itself, and the surface
self-intersects.

## Run it

Static site, no build:

```bash
python3 serve.py 8777    # open http://127.0.0.1:8777
```

`serve.py` is `http.server` plus `Cache-Control: no-store`. Plain `python -m http.server` sends no
cache directives, so browsers reuse cached ES modules without revalidating and edits to `src/*.js`
appear to do nothing.

Note: `serve.py` binds to `127.0.0.1` (IPv4). On systems where the browser resolves `localhost` to
IPv6 (`::1`), the connection will be refused — use `http://127.0.0.1:8777` directly.

## Tests

```bash
node --test
```

Node's built-in runner, no framework and nothing to install. The tests cover the two modules that
import nothing — the mathematics in `src/camc.js` and the grid topology in `src/topology.js`. The
rendering needs a GPU and is checked by eye.

## History

This is a rebuild of a Processing 1.x sketch written in 2011, which used ControlP5 for its widgets,
the Flanagan library for quadrature, and JOGL for display. The original source, the matplotlib
prototypes that preceded it, and the screenshot this version was checked against are kept in
`../camc-archive/`.

Two things changed in the port. The height integral depends only on `s`, so it is now computed once
per row instead of once per vertex — at maximum resolution that is 200 integrations rather than
40,000, which is why the original needed a background thread and this does not. And the seam is
closed only when the sweep is a whole number of turns; the original stitched the last column back
to the first unconditionally, welding a spurious sheet across any partial sweep.

## Background

The mathematics follows the constant anisotropic mean curvature literature, in particular the
Wulff-shape treatment of anisotropic surface energies and Gielis' superformula:

- Gielis J (2003). *A generic geometric transformation that unifies a wide range of natural and
  abstract shapes.* American Journal of Botany 90(3), 333–338. doi:10.3732/ajb.90.3.333
- Koiso M, Palmer B (2008). *Equilibria for anisotropic surface energies and the Gielis formula.*
  Forma 23, 1–8.
- Koiso M, Palmer B (2008). *Rolling construction for anisotropic Delaunay surfaces.* Pacific
  Journal of Mathematics 234(2), 345–378.

## Publishing

There is no remote yet. To put it online, from this directory:

```bash
gh repo create biovisualize/camc --public --source=. --remote=origin --push
gh api -X POST repos/biovisualize/camc/pages -f 'source[branch]=main' -f 'source[path]=/'
```

Nothing needs building, so Pages can serve the branch root as it stands. The import map uses
relative paths, so it works unchanged under the `/camc/` path prefix.

## License

MIT — see [`LICENSE`](LICENSE).
