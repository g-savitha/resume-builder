# Generates LAWS.bend / PROOF.bend for a simplified contrast model: 11 grey lightness levels (OKLab L = 0, 0.1 .. 1),
# WCAG contrast from real luminance (achromatic OKLab: Y = L^3), AA = 4.5:1.
N = 11
Y = [(i / 10) ** 3 for i in range(N)]
ratio = lambda a, b: (max(Y[a], Y[b]) + 0.05) / (min(Y[a], Y[b]) + 0.05)
L = [f"L{i}" for i in range(N)]
out = ["import Base", "", "# A grey lightness level, OKLab L = n/10.", "type Level is Data:"]
out += [f"  {l}{{}}" for l in L]
out += ["", "type Mode is Data:", "  Light{}", "  Dark{}", ""]
# aa(text, bg): nested match, generated from the real ratio
out += ["# True when text on bg reaches WCAG AA (4.5:1). Generated from real luminance.", "def aa(+t: Level, +bg: Level) -> Bool:", "  match t:"]
for a in range(N):
    out += [f"    case {L[a]}{{}}:", "      match bg:"]
    for b in range(N):
        out += [f"        case {L[b]}{{}}:", f"          {'True' if ratio(a, b) >= 4.5 else 'False'}{{}}"]
out += ["", "# The darkest and lightest inks.",
"def pick(ok_black: Bool) -> Level:", "  match ok_black:", "    case True{}:", "      L0{}", "    case False{}:", "      L10{}", "",
"# Keep the text if it passes, else black if black passes on bg, else white (mirrors ensureContrast's fallback).",
"def keep_or(ok: Bool, +t: Level, +bg: Level) -> Level:", "  match ok:", "    case True{}:", "      t", "    case False{}:", "      pick(aa(L0{}, bg))", "",
"def ensure_contrast(+t: Level, +bg: Level) -> Level:", "  keep_or(aa(t, bg), t, bg)", "",
"type Palette is Data:", "  Palette{page: Level, text: Level}", "",
"# Light mode: the page is always white (deviation 46); text is solved against it.",
"def derive_palette(m: Mode, +brand: Level) -> Palette:", "  match m:", "    case Light{}:", "      Palette{L10{}, ensure_contrast(brand, L10{})}", "    case Dark{}:", "      Palette{L0{}, ensure_contrast(brand, L0{})}", "",
"def page_of(p: Palette) -> Level:", "  match p:", "    case Palette{page, text}:", "      page", "",
"def text_of(p: Palette) -> Level:", "  match p:", "    case Palette{page, text}:", "      text", ""]
open("model.bend", "w").write("\n".join(out))

laws = ["import Base", "import ./model.bend as M", "",
"# LAW: whatever text and background, ensure_contrast's answer passes AA on that background.",
"law aa_always:", "  for +t: M.Level", "  for +bg: M.Level", "  {M.aa(M.ensure_contrast(t, bg), bg) == True{} : Bool}", "",
"# LAW: in light mode the page is white, for any brand color.",
"law page_white:", "  for +brand: M.Level", "  {M.page_of(M.derive_palette(M.Light{}, brand)) == M.L10{} : M.Level}", "",
"# LAW: the palette's text passes AA on its page, in either mode.",
"law palette_aa:", "  for m: M.Mode", "  for +brand: M.Level", "  {M.aa(M.text_of(M.derive_palette(m, brand)), M.page_of(M.derive_palette(m, brand))) == True{} : Bool}", ""]
open("LAWS.bend", "w").write("\n".join(laws))

proof = ["import Base", "import ./LAWS.bend as Laws", "import ./model.bend as M", "",
"# Exhaustive case analysis: each case computes to True{} by reflexivity.",
"def Laws.aa_always(t, bg):", "  match t:"]
for a in range(N):
    proof += [f"    case M.{L[a]}{{}}:", "      match bg:"]
    for b in range(N):
        proof += [f"        case M.{L[b]}{{}}:", "          {==}"]
proof += ["", "def Laws.page_white(brand):", "  {==}", "",
"def Laws.palette_aa(m, brand):", "  match m:", "    case M.Light{}:", "      match brand:"]
for a in range(N):
    proof += [f"        case M.{L[a]}{{}}:", "          {==}"]
proof += ["    case M.Dark{}:", "      match brand:"]
for a in range(N):
    proof += [f"        case M.{L[a]}{{}}:", "          {==}"]
open("PROOF.bend", "w").write("\n".join(proof) + "\n")
