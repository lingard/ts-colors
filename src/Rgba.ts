/**
 * @since 0.1.5
 */
import * as Ord from 'fp-ts/Ord'
import * as Equals from 'fp-ts/Eq'
import * as Sh from 'fp-ts/Show'
import * as number from 'fp-ts/number'
import * as struct from 'fp-ts/struct'
import { UnitInterval, unitInterval } from './UnitInterval'
import { Hsla } from './Hsla'
import { clipHue } from './Hue'
import { XYZ } from './XYZ'
import { interpolate } from './Math'
import { pipe } from 'fp-ts/function'

const clampChannel = Ord.clamp(number.Ord)(0, 255)

interface ChannelBrand {
  readonly Channel: unique symbol
}

/**
 * @since 0.1.5
 * @category model
 */
export type Channel = number & ChannelBrand

/**
 * @since 0.1.5
 * @internal
 */
export const channel = (n: number): Channel => clampChannel(n) as Channel

/**
 * @since 0.1.5
 * @internal
 */
export const channelFromInterval = (n: number): number =>
  pipe(Math.round(n * 255.0), channel)

/**
 * Represents a color using the rgb color system
 *
 * @category model
 * @since 0.1.5
 */
export interface Rgba {
  /**
   * A number between `0` and `255` representing the red channel of the color
   */
  readonly r: Channel

  /**
   * A number between `0` and `255` representing the green channel of the color
   */
  readonly g: Channel

  /**
   * A number between `0` and `255` representing the blue channel of the color
   */
  readonly b: Channel

  /**
   * A number between `0` and `1` representing the opacity or transparency of the color
   * where `0` is fully transparent and `1` is fully opaque.
   */
  readonly a: UnitInterval
}

/**
 * A rgb color where the channels are represented by range between `0` to `1`
 *
 * @category model
 * @since 0.1.5
 * @internal
 */
export interface Normalized {
  /**
   * A number between `0` and `1` representing the red channel of the color
   */
  readonly r: UnitInterval

  /**
   * A number between `0` and `1` representing the green channel of the color
   */
  readonly g: UnitInterval

  /**
   * A number between `0` and `1` representing the blue channel of the color
   */
  readonly b: UnitInterval

  /**
   * A number between `0` and `1` representing the opacity or transparency of the color
   * where `0` is fully transparent and `1` is fully opaque.
   */
  readonly a: UnitInterval
}

/**
 * @since 0.1.5
 * @category constructors
 */
export const rgba = (r: number, g: number, b: number, a: number): Rgba => ({
  r: channel(r),
  g: channel(g),
  b: channel(b),
  a: unitInterval(a)
})

/**
 * @since 0.1.5
 * @category constructors
 */
export const rgb = (r: number, g: number, b: number): Rgba => rgba(r, g, b, 1.0)

/**
 * @since 0.1.5
 * @category constructors
 * @internal
 */
const normalized = (
  r: number,
  g: number,
  b: number,
  a: number
): Normalized => ({
  r: unitInterval(r),
  g: unitInterval(g),
  b: unitInterval(b),
  a: unitInterval(a)
})

/**
 * @since 0.1.5
 * @category constructors
 * @internal
 */
export const normalize = (c: Rgba): Normalized =>
  normalized(c.r / 255, c.g / 255, c.b / 255, c.a)

/**
 * @since 0.1.5
 * @category constructors
 * @internal
 */
export const normalizedFromHsla: (c: Hsla) => Normalized = ({ h, s, l, a }) => {
  const ch = clipHue(h) / 60.0
  const chr = (1.0 - Math.abs(2.0 * l - 1.0)) * s
  const m = l - chr / 2.0
  const x = chr * (1.0 - Math.abs((ch % 2.0) - 1.0))

  const channels = () => {
    if (ch < 1.0) {
      return { r: chr, g: x, b: 0.0 }
    }

    if (1.0 <= ch && ch < 2.0) {
      return { r: x, g: chr, b: 0.0 }
    }

    if (2.0 <= ch && ch < 3.0) {
      return { r: 0.0, g: chr, b: x }
    }

    if (3.0 <= ch && ch < 4.0) {
      return { r: 0.0, g: x, b: chr }
    }

    if (4.0 <= ch && ch < 5.0) {
      return { r: x, g: 0.0, b: chr }
    }

    return { r: chr, g: 0.0, b: x }
  }

  const rgb = channels()

  return normalized(rgb.r + m, rgb.g + m, rgb.b + m, a)
}

/**
 * @since 0.1.5
 * @category constructors
 * @internal
 */
const fromNormalized: (c: Normalized) => Rgba = (c) =>
  rgba(
    channelFromInterval(c.r),
    channelFromInterval(c.g),
    channelFromInterval(c.b),
    c.a
  )

/**
 * @since 0.1.5
 * @category constructors
 */
export const fromHSLA: (c: Hsla) => Rgba = (c) =>
  pipe(normalizedFromHsla(c), fromNormalized)

/**
 * @category constructors
 * @since 0.1.5
 */
export const fromXYZ = ({ x, y, z }: XYZ): Rgba => {
  const f = (c: number) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055

  const r = f(3.2406 * x - 1.5372 * y - 0.4986 * z)
  const g = f(-0.9689 * x + 1.8758 * y + 0.0415 * z)
  const b = f(0.0557 * x - 0.204 * y + 1.057 * z)

  return rgb(r * 255, g * 255, b * 255)
}

/**
 * @since 0.1.5
 */
export const maxChroma: (c: Rgba) => number = ({ r, g, b }) =>
  Math.max(Math.max(r, g), b)

/**
 * @since 0.1.5
 */
export const minChroma: (c: Rgba) => number = ({ r, g, b }) =>
  Math.min(Math.min(r, g), b)

/**
 * @since 0.1.5
 */
export const chroma: (c: Rgba) => number = (c) => maxChroma(c) - minChroma(c)

/**
 * The percieved brightness of the color (A number between 0.0 and 1.0).
 * See: https://www.w3.org/TR/AERT#color-contrast
 *
 * @since 0.1.5
 */
export const brightness = (c: Rgba): number =>
  pipe(normalize(c), (c) => (299.0 * c.r + 587.0 * c.g + 114.0 * c.b) / 1000.0)

/**
 * The relative brightness of a color (normalized to 0.0 for darkest black
 * and 1.0 for lightest white), according to the WCAG definition.
 *
 * See: https://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
 *
 * @since 0.1.5
 */
export const luminance: (color: Rgba) => number = (c): number => {
  const rgba = normalize(c)
  const f = (c: number) => {
    if (c <= 0.03928) {
      return c / 12.92
    }

    return Math.pow((c + 0.055) / 1.055, 2.4)
  }

  const r = f(rgba.r)
  const g = f(rgba.g)
  const b = f(rgba.b)

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * @since 0.1.5
 */
export const evolve: <F extends { [K in keyof Rgba]: (a: Rgba[K]) => number }>(
  transformations: F
) => (c: Rgba) => Rgba = (t) => (c) =>
  pipe(c, struct.evolve(t), ({ r, g, b, a }) => rgba(r, g, b, a))

/**
 * @since 0.1.5
 */
export const evolveNormalized: <
  F extends { [K in keyof Normalized]: (a: Normalized[K]) => number }
>(
  transformations: F
) => (c: Normalized) => Normalized = (t) => (c) =>
  pipe(c, struct.evolve(t), ({ r, g, b, a }) => normalized(r, g, b, a))

/**
 * @since 0.1.5
 */
export const mix =
  (ratio: number) =>
  (a: Rgba) =>
  (b: Rgba): Rgba => {
    const i = interpolate(ratio)
    const na = normalize(a)

    return pipe(
      normalize(b),
      evolveNormalized({
        r: i(na.r),
        g: i(na.g),
        b: i(na.b),
        a: i(na.a)
      }),
      fromNormalized
    )
  }

/**
 * A CSS representation of the color in the form `rgb(..)` or `rgba(...)`
 *
 * @since 0.1.0
 * @category destructors
 */
export const toCSS = (c: Rgba): string =>
  c.a === 1.0
    ? `rgb(${c.r}, ${c.g}, ${c.b})`
    : `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`

/**
 * @category instances
 * @since 0.1.5
 */
export const Eq: Equals.Eq<Rgba> = Equals.struct({
  r: number.Eq,
  g: number.Eq,
  b: number.Eq,
  a: number.Eq
})

/**
 * @category instances
 * @since 0.1.0
 */
export const Show: Sh.Show<Rgba> = Sh.struct({
  r: number.Show,
  g: number.Show,
  b: number.Show,
  a: number.Show
})
