# Open application logo family

24 standalone SVG assets, using the OpenENV console design palette from
[`website/src/styles/global.css`](../../website/src/styles/global.css).

All assets have transparent backgrounds. The approved symbol geometry and
lettering contours are preserved. Lettering is outlined and needs no installed
fonts. Icon-only files retain the open brackets and application-specific symbol,
with a tightly fitted canvas and no visible lettering.

## Variants

Each application has four files in its own directory:

- `<Name>-icon-light.svg`: symbol only, for white or light surfaces.
- `<Name>-icon-dark.svg`: symbol only, with contrasting colors for dark surfaces.
- `<Name>-wordmark-light.svg`: full logo and name, for white or light surfaces.
- `<Name>-wordmark-dark.svg`: full logo and name, with contrasting colors for dark surfaces.

Light/dark pairs have identical geometry and canvas dimensions. Only fills differ.
The dark variants use the console's light foreground color for brackets and the
`Open` prefix, with cyan and mint accents. The light variants use graphite and
the console's deeper teal shades to stay visible on white.

## Design-source colors

| Role | Light surfaces | Dark surfaces | Source |
| --- | --- | --- | --- |
| Brackets and `Open` prefix | `#0E161F` | `#DFE7EE` | `--surface`, `--text` |
| Primary accent and name suffix | `#467B8C` | `#64DBE5` | Active navigation border, `--cyan` |
| Secondary symbol accent | `#5C9EAE` | `#84E7CC` | Row-number color, primary-button gradient |
| Third queue block | `#32616D` | `#8B9DAC` | Badge border, `--muted` |

## Files

| Application | Icon / light | Icon / dark | Full logo / light | Full logo / dark |
| --- | --- | --- | --- | --- |
| OpenEnv | [icon light](OpenEnv/OpenEnv-icon-light.svg) | [icon dark](OpenEnv/OpenEnv-icon-dark.svg) | [wordmark light](OpenEnv/OpenEnv-wordmark-light.svg) | [wordmark dark](OpenEnv/OpenEnv-wordmark-dark.svg) |
| OpenSecret | [icon light](OpenSecret/OpenSecret-icon-light.svg) | [icon dark](OpenSecret/OpenSecret-icon-dark.svg) | [wordmark light](OpenSecret/OpenSecret-wordmark-light.svg) | [wordmark dark](OpenSecret/OpenSecret-wordmark-dark.svg) |
| OpenSocket | [icon light](OpenSocket/OpenSocket-icon-light.svg) | [icon dark](OpenSocket/OpenSocket-icon-dark.svg) | [wordmark light](OpenSocket/OpenSocket-wordmark-light.svg) | [wordmark dark](OpenSocket/OpenSocket-wordmark-dark.svg) |
| OpenQueue | [icon light](OpenQueue/OpenQueue-icon-light.svg) | [icon dark](OpenQueue/OpenQueue-icon-dark.svg) | [wordmark light](OpenQueue/OpenQueue-wordmark-light.svg) | [wordmark dark](OpenQueue/OpenQueue-wordmark-dark.svg) |
| OpenWeb | [icon light](OpenWeb/OpenWeb-icon-light.svg) | [icon dark](OpenWeb/OpenWeb-icon-dark.svg) | [wordmark light](OpenWeb/OpenWeb-wordmark-light.svg) | [wordmark dark](OpenWeb/OpenWeb-wordmark-dark.svg) |
| OpenEndpoint | [icon light](OpenEndpoint/OpenEndpoint-icon-light.svg) | [icon dark](OpenEndpoint/OpenEndpoint-icon-dark.svg) | [wordmark light](OpenEndpoint/OpenEndpoint-wordmark-light.svg) | [wordmark dark](OpenEndpoint/OpenEndpoint-wordmark-dark.svg) |

These are new assets. Existing README/site logo references and earlier logo variants remain available.
