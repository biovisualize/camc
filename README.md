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

```bash
node --test
```

## Background

The mathematics follows the constant anisotropic mean curvature literature, in particular the
Wulff-shape treatment of anisotropic surface energies and Gielis' superformula:

- Gielis J (2003). *A generic geometric transformation that unifies a wide range of natural and
  abstract shapes.* American Journal of Botany 90(3), 333–338. doi:10.3732/ajb.90.3.333
- Koiso M, Palmer B (2008). *Equilibria for anisotropic surface energies and the Gielis formula.*
  Forma 23, 1–8.
- Koiso M, Palmer B (2008). *Rolling construction for anisotropic Delaunay surfaces.* Pacific
  Journal of Mathematics 234(2), 345–378.

This is a rebuild of a Processing 1.x sketch written in 2011.

## License

MIT — see [`LICENSE`](LICENSE). That covers the code in `src/`, `test/`, `index.html` and
`serve.py`, all of which is original: the mathematics comes from the papers cited above rather than
from anyone's implementation.

The two files in [`vendor/`](vendor/README.md) are three.js r160, copied in rather than installed so
the project needs no build step. They are MIT too, but they are not mine — see
[`vendor/README.md`](vendor/README.md).
