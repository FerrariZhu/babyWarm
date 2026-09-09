# Clothing icon sources

Downloaded assets are bundled locally. There is no runtime request to an icon service.
Original SVG geometry is retained; React renders the original primitives and stroke settings.

- Lucide Lab 0.2.0, Lucide Icons and Contributors, ISC license: https://github.com/lucide-icons/lucide/tree/main/packages/lab
  Downloaded from the official `@lucide/lab` npm package. See LICENSE-Lucide.txt.
- IconPark Outline 1.4.2, ByteDance, Apache-2.0 license: https://github.com/bytedance/IconPark
  Downloaded via `@iconify-json/icon-park-outline` 1.2.4. See LICENSE-IconPark.txt.

Mappings live in `src/garment-icons.ts` (GARMENT_ICON_SOURCES).
Short/long bodysuits share the romper icon; vest/down vest, padded/down jackets,
mid/long trousers and closed shoes share family silhouettes. The adjacent category
name and variant chips carry distinctions unsupported by these icon libraries.
Do not draw extra seams or stretch artwork to imply material, sleeve or leg length.

Hat variants use IconPark sun-hat, Lucide hat-baseball and hat-beanie.
The diaper tip uses IconPark clothes-diapers.
