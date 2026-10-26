import Base

# A grey lightness level, OKLab L = n/10.
type Level is Data:
  L0{}
  L1{}
  L2{}
  L3{}
  L4{}
  L5{}
  L6{}
  L7{}
  L8{}
  L9{}
  L10{}

type Mode is Data:
  Light{}
  Dark{}

# True when text on bg reaches WCAG AA (4.5:1). Generated from real luminance.
def aa(+t: Level, +bg: Level) -> Bool:
  match t:
    case L0{}:
      match bg:
        case L0{}:
          False{}
        case L1{}:
          False{}
        case L2{}:
          False{}
        case L3{}:
          False{}
        case L4{}:
          False{}
        case L5{}:
          False{}
        case L6{}:
          True{}
        case L7{}:
          True{}
        case L8{}:
          True{}
        case L9{}:
          True{}
        case L10{}:
          True{}
    case L1{}:
      match bg:
        case L0{}:
          False{}
        case L1{}:
          False{}
        case L2{}:
          False{}
        case L3{}:
          False{}
        case L4{}:
          False{}
        case L5{}:
          False{}
        case L6{}:
          True{}
        case L7{}:
          True{}
        case L8{}:
          True{}
        case L9{}:
          True{}
        case L10{}:
          True{}
    case L2{}:
      match bg:
        case L0{}:
          False{}
        case L1{}:
          False{}
        case L2{}:
          False{}
        case L3{}:
          False{}
        case L4{}:
          False{}
        case L5{}:
          False{}
        case L6{}:
          True{}
        case L7{}:
          True{}
        case L8{}:
          True{}
        case L9{}:
          True{}
        case L10{}:
          True{}
    case L3{}:
      match bg:
        case L0{}:
          False{}
        case L1{}:
          False{}
        case L2{}:
          False{}
        case L3{}:
          False{}
        case L4{}:
          False{}
        case L5{}:
          False{}
        case L6{}:
          False{}
        case L7{}:
          True{}
        case L8{}:
          True{}
        case L9{}:
          True{}
        case L10{}:
          True{}
    case L4{}:
      match bg:
        case L0{}:
          False{}
        case L1{}:
          False{}
        case L2{}:
          False{}
        case L3{}:
          False{}
        case L4{}:
          False{}
        case L5{}:
          False{}
        case L6{}:
          False{}
        case L7{}:
          False{}
        case L8{}:
          True{}
        case L9{}:
          True{}
        case L10{}:
          True{}
    case L5{}:
      match bg:
        case L0{}:
          False{}
        case L1{}:
          False{}
        case L2{}:
          False{}
        case L3{}:
          False{}
        case L4{}:
          False{}
        case L5{}:
          False{}
        case L6{}:
          False{}
        case L7{}:
          False{}
        case L8{}:
          False{}
        case L9{}:
          False{}
        case L10{}:
          True{}
    case L6{}:
      match bg:
        case L0{}:
          True{}
        case L1{}:
          True{}
        case L2{}:
          True{}
        case L3{}:
          False{}
        case L4{}:
          False{}
        case L5{}:
          False{}
        case L6{}:
          False{}
        case L7{}:
          False{}
        case L8{}:
          False{}
        case L9{}:
          False{}
        case L10{}:
          False{}
    case L7{}:
      match bg:
        case L0{}:
          True{}
        case L1{}:
          True{}
        case L2{}:
          True{}
        case L3{}:
          True{}
        case L4{}:
          False{}
        case L5{}:
          False{}
        case L6{}:
          False{}
        case L7{}:
          False{}
        case L8{}:
          False{}
        case L9{}:
          False{}
        case L10{}:
          False{}
    case L8{}:
      match bg:
        case L0{}:
          True{}
        case L1{}:
          True{}
        case L2{}:
          True{}
        case L3{}:
          True{}
        case L4{}:
          True{}
        case L5{}:
          False{}
        case L6{}:
          False{}
        case L7{}:
          False{}
        case L8{}:
          False{}
        case L9{}:
          False{}
        case L10{}:
          False{}
    case L9{}:
      match bg:
        case L0{}:
          True{}
        case L1{}:
          True{}
        case L2{}:
          True{}
        case L3{}:
          True{}
        case L4{}:
          True{}
        case L5{}:
          False{}
        case L6{}:
          False{}
        case L7{}:
          False{}
        case L8{}:
          False{}
        case L9{}:
          False{}
        case L10{}:
          False{}
    case L10{}:
      match bg:
        case L0{}:
          True{}
        case L1{}:
          True{}
        case L2{}:
          True{}
        case L3{}:
          True{}
        case L4{}:
          True{}
        case L5{}:
          True{}
        case L6{}:
          False{}
        case L7{}:
          False{}
        case L8{}:
          False{}
        case L9{}:
          False{}
        case L10{}:
          False{}

# The darkest and lightest inks.
def pick(ok_black: Bool) -> Level:
  match ok_black:
    case True{}:
      L0{}
    case False{}:
      L10{}

# Keep the text if it passes, else black if black passes on bg, else white (mirrors ensureContrast's fallback).
def keep_or(ok: Bool, +t: Level, +bg: Level) -> Level:
  match ok:
    case True{}:
      t
    case False{}:
      pick(aa(L0{}, bg))

def ensure_contrast(+t: Level, +bg: Level) -> Level:
  keep_or(aa(t, bg), t, bg)

type Palette is Data:
  Palette{page: Level, text: Level}

# Light mode: the page is always white (deviation 46); text is solved against it.
def derive_palette(m: Mode, +brand: Level) -> Palette:
  match m:
    case Light{}:
      Palette{L10{}, ensure_contrast(brand, L10{})}
    case Dark{}:
      Palette{L0{}, ensure_contrast(brand, L0{})}

def page_of(p: Palette) -> Level:
  match p:
    case Palette{page, text}:
      page

def text_of(p: Palette) -> Level:
  match p:
    case Palette{page, text}:
      text
