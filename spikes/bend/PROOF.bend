import Base
import ./LAWS.bend as Laws
import ./model.bend as M

# Exhaustive case analysis: each case computes to True{} by reflexivity.
def Laws.aa_always(t, bg):
  match t:
    case M.L0{}:
      match bg:
        case M.L0{}:
          {==}
        case M.L1{}:
          {==}
        case M.L2{}:
          {==}
        case M.L3{}:
          {==}
        case M.L4{}:
          {==}
        case M.L5{}:
          {==}
        case M.L6{}:
          {==}
        case M.L7{}:
          {==}
        case M.L8{}:
          {==}
        case M.L9{}:
          {==}
        case M.L10{}:
          {==}
    case M.L1{}:
      match bg:
        case M.L0{}:
          {==}
        case M.L1{}:
          {==}
        case M.L2{}:
          {==}
        case M.L3{}:
          {==}
        case M.L4{}:
          {==}
        case M.L5{}:
          {==}
        case M.L6{}:
          {==}
        case M.L7{}:
          {==}
        case M.L8{}:
          {==}
        case M.L9{}:
          {==}
        case M.L10{}:
          {==}
    case M.L2{}:
      match bg:
        case M.L0{}:
          {==}
        case M.L1{}:
          {==}
        case M.L2{}:
          {==}
        case M.L3{}:
          {==}
        case M.L4{}:
          {==}
        case M.L5{}:
          {==}
        case M.L6{}:
          {==}
        case M.L7{}:
          {==}
        case M.L8{}:
          {==}
        case M.L9{}:
          {==}
        case M.L10{}:
          {==}
    case M.L3{}:
      match bg:
        case M.L0{}:
          {==}
        case M.L1{}:
          {==}
        case M.L2{}:
          {==}
        case M.L3{}:
          {==}
        case M.L4{}:
          {==}
        case M.L5{}:
          {==}
        case M.L6{}:
          {==}
        case M.L7{}:
          {==}
        case M.L8{}:
          {==}
        case M.L9{}:
          {==}
        case M.L10{}:
          {==}
    case M.L4{}:
      match bg:
        case M.L0{}:
          {==}
        case M.L1{}:
          {==}
        case M.L2{}:
          {==}
        case M.L3{}:
          {==}
        case M.L4{}:
          {==}
        case M.L5{}:
          {==}
        case M.L6{}:
          {==}
        case M.L7{}:
          {==}
        case M.L8{}:
          {==}
        case M.L9{}:
          {==}
        case M.L10{}:
          {==}
    case M.L5{}:
      match bg:
        case M.L0{}:
          {==}
        case M.L1{}:
          {==}
        case M.L2{}:
          {==}
        case M.L3{}:
          {==}
        case M.L4{}:
          {==}
        case M.L5{}:
          {==}
        case M.L6{}:
          {==}
        case M.L7{}:
          {==}
        case M.L8{}:
          {==}
        case M.L9{}:
          {==}
        case M.L10{}:
          {==}
    case M.L6{}:
      match bg:
        case M.L0{}:
          {==}
        case M.L1{}:
          {==}
        case M.L2{}:
          {==}
        case M.L3{}:
          {==}
        case M.L4{}:
          {==}
        case M.L5{}:
          {==}
        case M.L6{}:
          {==}
        case M.L7{}:
          {==}
        case M.L8{}:
          {==}
        case M.L9{}:
          {==}
        case M.L10{}:
          {==}
    case M.L7{}:
      match bg:
        case M.L0{}:
          {==}
        case M.L1{}:
          {==}
        case M.L2{}:
          {==}
        case M.L3{}:
          {==}
        case M.L4{}:
          {==}
        case M.L5{}:
          {==}
        case M.L6{}:
          {==}
        case M.L7{}:
          {==}
        case M.L8{}:
          {==}
        case M.L9{}:
          {==}
        case M.L10{}:
          {==}
    case M.L8{}:
      match bg:
        case M.L0{}:
          {==}
        case M.L1{}:
          {==}
        case M.L2{}:
          {==}
        case M.L3{}:
          {==}
        case M.L4{}:
          {==}
        case M.L5{}:
          {==}
        case M.L6{}:
          {==}
        case M.L7{}:
          {==}
        case M.L8{}:
          {==}
        case M.L9{}:
          {==}
        case M.L10{}:
          {==}
    case M.L9{}:
      match bg:
        case M.L0{}:
          {==}
        case M.L1{}:
          {==}
        case M.L2{}:
          {==}
        case M.L3{}:
          {==}
        case M.L4{}:
          {==}
        case M.L5{}:
          {==}
        case M.L6{}:
          {==}
        case M.L7{}:
          {==}
        case M.L8{}:
          {==}
        case M.L9{}:
          {==}
        case M.L10{}:
          {==}
    case M.L10{}:
      match bg:
        case M.L0{}:
          {==}
        case M.L1{}:
          {==}
        case M.L2{}:
          {==}
        case M.L3{}:
          {==}
        case M.L4{}:
          {==}
        case M.L5{}:
          {==}
        case M.L6{}:
          {==}
        case M.L7{}:
          {==}
        case M.L8{}:
          {==}
        case M.L9{}:
          {==}
        case M.L10{}:
          {==}

def Laws.page_white(brand):
  {==}

def Laws.palette_aa(m, brand):
  match m:
    case M.Light{}:
      match brand:
        case M.L0{}:
          {==}
        case M.L1{}:
          {==}
        case M.L2{}:
          {==}
        case M.L3{}:
          {==}
        case M.L4{}:
          {==}
        case M.L5{}:
          {==}
        case M.L6{}:
          {==}
        case M.L7{}:
          {==}
        case M.L8{}:
          {==}
        case M.L9{}:
          {==}
        case M.L10{}:
          {==}
    case M.Dark{}:
      match brand:
        case M.L0{}:
          {==}
        case M.L1{}:
          {==}
        case M.L2{}:
          {==}
        case M.L3{}:
          {==}
        case M.L4{}:
          {==}
        case M.L5{}:
          {==}
        case M.L6{}:
          {==}
        case M.L7{}:
          {==}
        case M.L8{}:
          {==}
        case M.L9{}:
          {==}
        case M.L10{}:
          {==}
