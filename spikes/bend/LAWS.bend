import Base
import ./model.bend as M

# LAW: whatever text and background, ensure_contrast's answer passes AA on that background.
law aa_always:
  for +t: M.Level
  for +bg: M.Level
  {M.aa(M.ensure_contrast(t, bg), bg) == True{} : Bool}

# LAW: in light mode the page is white, for any brand color.
law page_white:
  for +brand: M.Level
  {M.page_of(M.derive_palette(M.Light{}, brand)) == M.L10{} : M.Level}

# LAW: the palette's text passes AA on its page, in either mode.
law palette_aa:
  for m: M.Mode
  for +brand: M.Level
  {M.aa(M.text_of(M.derive_palette(m, brand)), M.page_of(M.derive_palette(m, brand))) == True{} : Bool}
