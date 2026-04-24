# DSIG PDF Service Bootstrap Implementation Plan

**Status:** DEPRECATED 2026-04-24 · replaced by in-repo Chromium HTML→PDF
**Commit range:** — (Python service was in a separate repo: `demand-signals/dsig-pdf-service`)
**See also:** `docs/superpowers/specs/2026-04-24-pdf-pipeline.md`, `docs/runbooks/pdf-pipeline.md`
**Notes:** Python Flask microservice retired. Implementation files in `src/lib/pdf/` use puppeteer-core + @sparticuz/chromium instead. The `pdf.demandsignals.co` subdomain and `PDF_SERVICE_URL` / `PDF_SERVICE_SECRET` env vars can be retired. `DSIG_PDF_STANDARDS_v2.md` (external) still governs the visual design.

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap a new standalone repo `dsig-pdf-service` that renders branded PDFs from JSON payloads. First and only doc type shipped in this plan: `invoice`. Future doc types (proposal, SOW, estimate, report, audit) slot in as additional files in `dsig_pdf/docs/` sharing the same covers/components/typography.

**Architecture:** Python 3.11 Vercel serverless function. Single POST endpoint at `/api/render` accepts `{doc_type, version, data}` + Bearer token auth. Uses `reportlab` to compose Legal-portrait PDFs following `DSIG_PDF_STANDARDS_v2.md` exactly (slate covers, orange/teal palette, gradient bar, ODiv, famous-quote back cover). One enhancement to shared modules propagates to every DSIG PDF forever.

**Tech Stack:** Python 3.11, reportlab, pypdf, pydantic, pytest, Vercel serverless runtime.

**Reference doc (authoritative for every visual decision):** `D:\CLAUDE\DSIG\DSIG_PDF_STANDARDS_v2.md`

**Prerequisites (Hunter must complete before Task 1):**
- New empty GitHub repo created: `demand-signals/dsig-pdf-service`
- Repo imported to Vercel as new project (Python framework preset auto-detected)
- Custom domain `pdf.demandsignals.co` added to the Vercel project (CNAME to Vercel)
- A 64-character random hex secret generated (e.g., `openssl rand -hex 32`)
- Vercel env var on `dsig-pdf-service` project: `PDF_SERVICE_SECRET=<secret>`
- Vercel env var on `demandsignals-next` project: `PDF_SERVICE_SECRET=<same secret>` + `PDF_SERVICE_URL=https://pdf.demandsignals.co`
- Local working copy of `dsig-pdf-service` repo cloned somewhere convenient (suggested: `D:\CLAUDE\dsig-pdf-service`)

**Note on working directory:** Every command in this plan runs from the `dsig-pdf-service` repo root unless explicitly noted otherwise. Commits land in that repo, not in `demandsignals-next`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `requirements.txt` | Python deps: reportlab, pypdf, pydantic, pytest |
| `vercel.json` | Python runtime config + routing |
| `.gitignore` | Standard Python + Vercel ignores |
| `README.md` | How to add a doc type, how to deploy, API contract |
| `api/render.py` | Vercel serverless entry — auth, dispatch, streaming |
| `dsig_pdf/__init__.py` | Package marker + version |
| `dsig_pdf/standards.py` | Every color, font, size from `DSIG_PDF_STANDARDS_v2` |
| `dsig_pdf/layout.py` | Legal page setup, frame calculations, margins |
| `dsig_pdf/typography.py` | ParagraphStyle definitions (H1/H2/H3/Body/etc.) |
| `dsig_pdf/tables.py` | `MT()` helper + `bts()` function (mandatory Paragraph-wrapped cells) |
| `dsig_pdf/components.py` | ODiv, GradientBar, StatRow, Callout, AlertBox, PaidStamp, VoidStamp |
| `dsig_pdf/covers.py` | FrontCover, BackCover (full-bleed slate + circles) |
| `dsig_pdf/quotes.py` | Famous-quote library + seeded picker |
| `dsig_pdf/docs/__init__.py` | Package marker |
| `dsig_pdf/docs/invoice.py` | Invoice doc assembly (uses shared components + covers) |
| `tests/__init__.py` | Test package marker |
| `tests/fixtures/sample_invoice.json` | Canonical test payload |
| `tests/test_standards.py` | Verifies color constants + font names |
| `tests/test_quotes.py` | Verifies deterministic seeded selection |
| `tests/test_components.py` | Verifies component flowables render without error |
| `tests/test_invoice_render.py` | Full invoice render → valid 3-page PDF |
| `.github/workflows/ci.yml` | GitHub Actions: run pytest on PR |

---

## Task 1: Initialize the repo

**Files:**
- Create: `requirements.txt`, `vercel.json`, `.gitignore`, `README.md`

- [ ] **Step 1: Create `requirements.txt`**

```
reportlab==4.2.2
pypdf==4.3.1
pydantic==2.9.2
pytest==8.3.3
```

- [ ] **Step 2: Create `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/render.py": {
      "runtime": "python3.11",
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

- [ ] **Step 3: Create `.gitignore`**

```
# Python
__pycache__/
*.py[cod]
*$py.class
.pytest_cache/
.venv/
venv/
env/

# Vercel
.vercel/

# IDE
.vscode/
.idea/

# Output
*.pdf
!tests/fixtures/*.pdf
```

- [ ] **Step 4: Create `README.md`**

```markdown
# dsig-pdf-service

Branded PDF rendering microservice for Demand Signals projects.

## API

`POST https://pdf.demandsignals.co/api/render`

```
Authorization: Bearer <PDF_SERVICE_SECRET>
Content-Type: application/json

{
  "doc_type": "invoice" | "proposal" | "sow" | ...,
  "version": 1,
  "data": { ... }
}
```

Returns `200 OK` with `Content-Type: application/pdf`.

## Shipped doc types

- `invoice` — standard + $0 Restaurant Rule invoices (v1 of this service)

## Adding a new doc type

1. Add `dsig_pdf/docs/<doc_type>.py` exporting `render(data: dict) -> bytes`
2. Use shared modules: `covers.FrontCover/BackCover`, `components.*`, `typography.*`, `quotes.pick_quote(doc_type, seed=...)`
3. Register in `api/render.py` dispatch dict
4. Add a pydantic schema validating `data`
5. Add `tests/test_<doc_type>_render.py`

## Local dev

```bash
pip install -r requirements.txt
pytest
```

## Visual standards

See `D:/CLAUDE/DSIG/DSIG_PDF_STANDARDS_v2.md` (authoritative).
All colors, fonts, and component specs in `dsig_pdf/standards.py` derive from that doc.
```

- [ ] **Step 5: Initialize git, commit**

```bash
git init
git add requirements.txt vercel.json .gitignore README.md
git commit -m "$(cat <<'EOF'
chore: initialize dsig-pdf-service repo

Python 3.11 Vercel serverless. reportlab + pypdf + pydantic + pytest.
One endpoint (api/render.py) shipping invoice as the first doc type.

Reference: D:/CLAUDE/DSIG/DSIG_PDF_STANDARDS_v2.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Port visual standards to `standards.py`

**Files:**
- Create: `dsig_pdf/__init__.py`, `dsig_pdf/standards.py`
- Create: `tests/__init__.py`, `tests/test_standards.py`

- [ ] **Step 1: Create `dsig_pdf/__init__.py`**

```python
__version__ = "0.1.0"
```

- [ ] **Step 2: Create `tests/__init__.py`**

Empty file:

```python
```

- [ ] **Step 3: Write failing test `tests/test_standards.py`**

```python
from dsig_pdf import standards


def test_color_slate_exists():
    assert standards.SLATE == (0x3D / 255, 0x45 / 255, 0x66 / 255)


def test_color_teal_spec_exists():
    assert standards.TEAL_S == (0x3E / 255, 0xCF / 255, 0xAA / 255)


def test_color_orange_spec_exists():
    assert standards.ORANGE_S == (0xF2 / 255, 0x64 / 255, 0x19 / 255)


def test_color_red_exists():
    assert standards.RED == (0xE5 / 255, 0x39 / 255, 0x35 / 255)


def test_page_size_is_legal_portrait():
    from reportlab.lib.pagesizes import legal
    assert standards.PAGE_SIZE == legal


def test_margin_is_54pt():
    assert standards.MARGIN == 54


def test_base_font_is_helvetica():
    assert standards.FONT_BASE == "Helvetica"
    assert standards.FONT_BOLD == "Helvetica-Bold"
```

- [ ] **Step 4: Run test to verify it fails**

Run:

```bash
pytest tests/test_standards.py -v
```

Expected: all tests fail with `ModuleNotFoundError: No module named 'dsig_pdf.standards'` or similar (module doesn't exist yet).

- [ ] **Step 5: Create `dsig_pdf/standards.py`**

```python
# ── DSIG PDF Generation Standards v2 ────────────────────────────────
# Source: D:/CLAUDE/DSIG/DSIG_PDF_STANDARDS_v2.md
#
# Every color, font size, and layout constant lives here. Changing any
# value propagates to every doc type in every DSIG project forever.
# That's the point.

from reportlab.lib.colors import Color
from reportlab.lib.pagesizes import legal


def _hex(h: str) -> tuple[float, float, float]:
    """Convert #RRGGBB string to reportlab (r, g, b) float tuple."""
    h = h.lstrip("#")
    return (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255)


def _rgba(h: str, a: float) -> Color:
    """Convert #RRGGBB hex + alpha to a reportlab Color with transparency."""
    r, g, b = _hex(h)
    return Color(r, g, b, alpha=a)


# ── Color palette (from DSIG_PDF_STANDARDS_v2 §COLOR PALETTE) ────────
SLATE = _hex("#3D4566")           # Cover bg, dark section bg, table headers
SLATE_MID = _hex("#4A5578")       # Decorative circles (usually @35% opacity)
SLATE_MID_35 = _rgba("#4A5578", 0.35)

TEAL = _hex("#52C9A0")            # Accent headlines, eyebrow labels
TEAL_S = _hex("#3ECFAA")          # TOC page numbers, callout borders
ORANGE = _hex("#FF6B2B")          # CTA buttons, decorative elements
ORANGE_S = _hex("#F26419")        # Dividers under H1, alert bg, cover pill

WHITE = _hex("#FFFFFF")
OFF_WHITE = _hex("#F8F9FA")       # Alternating table rows
GRAY = _hex("#888888")            # Captions, eyebrow labels, footer
BODY = _hex("#333333")            # All body copy on white bg
BORDER = _hex("#E2E8F0")          # Table grid lines, card borders
RULE = _hex("#DDDDDD")            # Separator lines (header/footer)
EEEE = _hex("#EEEEEE")            # TOC row separators
RED = _hex("#E53935")             # Critical severity badges
VLO = _hex("#FFF8F5")             # Orange callout background (very light)
VLT = _hex("#F0FDF8")             # Teal callout background (very light)
CCCC = _hex("#CCCCCC")            # Stat box labels, cover subtext

# Stamp colors (new in v2 for PAID/VOID)
EMERALD = _hex("#10B981")         # PAID stamp
EMERALD_30 = _rgba("#10B981", 0.30)
RED_30 = _rgba("#E53935", 0.30)   # VOID stamp
WHITE_60 = _rgba("#FFFFFF", 0.60) # VOID body dimmer

# ── Page layout ──────────────────────────────────────────────────────
PAGE_SIZE = legal                 # (612, 1008) points = 8.5" x 14"
PAGE_W, PAGE_H = PAGE_SIZE
MARGIN = 54                       # 0.75 inch
FRAME_W = PAGE_W - 2 * MARGIN     # 504 pt usable width

# ── Typography ───────────────────────────────────────────────────────
FONT_BASE = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
FONT_MONO = "Courier"

# Size scale (from DSIG_PDF_STANDARDS_v2 §TYPOGRAPHY SYSTEM)
SIZE_EYEBROW = 8
SIZE_H1 = 22
SIZE_H2 = 9
SIZE_H3 = 10
SIZE_BODY = 10
SIZE_BODY_SMALL = 8
SIZE_CODE = 7
SIZE_TOC_NUM = 18
SIZE_STAT_VALUE = 28
SIZE_STAMP = 48

# Line height
LEADING_BODY = 1.6
```

- [ ] **Step 6: Run test to verify it passes**

Run:

```bash
pytest tests/test_standards.py -v
```

Expected: `7 passed`.

- [ ] **Step 7: Commit**

```bash
git add dsig_pdf/__init__.py dsig_pdf/standards.py tests/__init__.py tests/test_standards.py
git commit -m "$(cat <<'EOF'
feat(standards): port DSIG_PDF_STANDARDS_v2 color + layout constants

Source of truth for every DSIG-branded PDF forever. One change here
propagates to every doc type across every DSIG project.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Layout helpers

**Files:**
- Create: `dsig_pdf/layout.py`

- [ ] **Step 1: Create `dsig_pdf/layout.py`**

```python
# ── Legal-portrait page layout helpers ──────────────────────────────

from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate
from . import standards as s


def make_doc(output) -> BaseDocTemplate:
    """Create a BaseDocTemplate with cover/interior/back page templates.
    `output` can be a path string or a BytesIO."""
    doc = BaseDocTemplate(
        output,
        pagesize=s.PAGE_SIZE,
        leftMargin=s.MARGIN,
        rightMargin=s.MARGIN,
        topMargin=s.MARGIN + 22,  # extra for gradient bar + header row
        bottomMargin=s.MARGIN,
    )

    cover_frame = Frame(
        0, 0, s.PAGE_W, s.PAGE_H,
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        id="cover",
    )
    interior_frame = Frame(
        s.MARGIN, s.MARGIN + 10, s.FRAME_W, s.PAGE_H - 2 * s.MARGIN - 44,
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        id="interior",
    )
    back_frame = Frame(
        0, 0, s.PAGE_W, s.PAGE_H,
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        id="back",
    )

    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame], onPage=_paint_cover),
        PageTemplate(id="interior", frames=[interior_frame], onPage=_paint_interior),
        PageTemplate(id="back", frames=[back_frame], onPage=_paint_back),
    ])
    return doc


def _paint_cover(canvas, doc):
    """Full-bleed slate background + decorative circles."""
    canvas.saveState()
    canvas.setFillColorRGB(*s.SLATE)
    canvas.rect(0, 0, s.PAGE_W, s.PAGE_H, fill=1, stroke=0)
    # Upper-right large circle
    canvas.setFillColor(s.SLATE_MID_35)
    canvas.circle(s.PAGE_W + 20, s.PAGE_H - 100, 180, fill=1, stroke=0)
    # Lower-left smaller circle
    canvas.circle(-20, 80, 120, fill=1, stroke=0)
    canvas.restoreState()


def _paint_interior(canvas, doc):
    """Gradient bar top + separator rule. Section label set by SecTrack."""
    canvas.saveState()
    # Gradient bar: 80-step orange → teal
    orange_r, orange_g, orange_b = s.ORANGE_S
    teal_r, teal_g, teal_b = s.TEAL_S
    steps = 80
    step_w = s.PAGE_W / steps
    bar_y = s.PAGE_H - 4
    for i in range(steps):
        t = i / (steps - 1)
        r = orange_r + (teal_r - orange_r) * t
        g = orange_g + (teal_g - orange_g) * t
        b = orange_b + (teal_b - orange_b) * t
        canvas.setFillColorRGB(r, g, b)
        canvas.rect(i * step_w, bar_y, step_w + 0.5, 4, fill=1, stroke=0)
    # Separator rule below header row
    canvas.setStrokeColorRGB(*s.RULE)
    canvas.setLineWidth(0.5)
    canvas.line(s.MARGIN, s.PAGE_H - s.MARGIN + 6, s.PAGE_W - s.MARGIN, s.PAGE_H - s.MARGIN + 6)
    # Footer
    canvas.setFillColorRGB(*s.GRAY)
    canvas.setFont(s.FONT_BASE, 8)
    canvas.drawCentredString(
        s.PAGE_W / 2, s.MARGIN / 2,
        f"Demand Signals — Confidential  |  Page {doc.page}  |  DemandSignals.co",
    )
    canvas.restoreState()


def _paint_back(canvas, doc):
    """Same as cover — full-bleed slate + circles."""
    _paint_cover(canvas, doc)
```

- [ ] **Step 2: Verify import works**

Run:

```bash
python -c "from dsig_pdf.layout import make_doc; print('ok')"
```

Expected: `ok` printed, no errors.

- [ ] **Step 3: Commit**

```bash
git add dsig_pdf/layout.py
git commit -m "$(cat <<'EOF'
feat(layout): add page template + cover/interior/back painters

make_doc() returns a BaseDocTemplate wired with three page templates
and their canvas painters (slate covers, gradient-bar interiors,
footer with page numbers).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Typography

**Files:**
- Create: `dsig_pdf/typography.py`

- [ ] **Step 1: Create `dsig_pdf/typography.py`**

```python
# ── Paragraph styles ────────────────────────────────────────────────

from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import Color
from . import standards as s


def _color(rgb):
    return Color(*rgb)


EYEBROW = ParagraphStyle(
    "Eyebrow",
    fontName=s.FONT_BASE,
    fontSize=s.SIZE_EYEBROW,
    textColor=_color(s.TEAL),
    spaceAfter=6,
    leading=10,
    alignment=0,  # TA_LEFT
)

H1 = ParagraphStyle(
    "H1",
    fontName=s.FONT_BOLD,
    fontSize=s.SIZE_H1,
    textColor=_color(s.SLATE),
    spaceAfter=4,
    leading=26,
)

H2 = ParagraphStyle(
    "H2",
    fontName=s.FONT_BASE,
    fontSize=s.SIZE_H2,
    textColor=_color(s.TEAL),
    spaceAfter=4,
    leading=12,
)

H3 = ParagraphStyle(
    "H3",
    fontName=s.FONT_BOLD,
    fontSize=s.SIZE_H3,
    textColor=_color(s.SLATE),
    spaceAfter=4,
    leading=13,
)

BODY = ParagraphStyle(
    "Body",
    fontName=s.FONT_BASE,
    fontSize=s.SIZE_BODY,
    textColor=_color(s.BODY),
    leading=s.SIZE_BODY * s.LEADING_BODY,
    spaceAfter=6,
)

BODY_SMALL = ParagraphStyle(
    "BodySmall",
    fontName=s.FONT_BASE,
    fontSize=s.SIZE_BODY_SMALL,
    textColor=_color(s.BODY),
    leading=s.SIZE_BODY_SMALL * s.LEADING_BODY,
)

CELL = ParagraphStyle(
    "Cell",
    fontName=s.FONT_BASE,
    fontSize=7.5,
    textColor=_color(s.BODY),
    leading=10,
)

CELL_HEADER = ParagraphStyle(
    "CellHeader",
    fontName=s.FONT_BOLD,
    fontSize=7.5,
    textColor=_color(s.WHITE),
    leading=10,
)

QUOTE = ParagraphStyle(
    "Quote",
    fontName="Helvetica-Oblique",
    fontSize=14,
    textColor=_color(s.TEAL_S),
    leading=20,
    alignment=1,  # TA_CENTER
)
```

- [ ] **Step 2: Verify import works**

Run:

```bash
python -c "from dsig_pdf.typography import H1, BODY, QUOTE; print('ok')"
```

Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add dsig_pdf/typography.py
git commit -m "$(cat <<'EOF'
feat(typography): ParagraphStyle definitions per DSIG_PDF_STANDARDS_v2

EYEBROW / H1 / H2 / H3 / BODY / BODY_SMALL / CELL / CELL_HEADER / QUOTE.
Consumed by every doc type via typography module.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Tables helper

**Files:**
- Create: `dsig_pdf/tables.py`

- [ ] **Step 1: Create `dsig_pdf/tables.py`**

```python
# ── Table rendering helpers ─────────────────────────────────────────
#
# ⚠️ MANDATORY per DSIG_PDF_STANDARDS_v2: every table cell MUST be a
# Paragraph object, never a raw string. Raw strings overflow the page.
# Helper function `MT` enforces this.

from reportlab.platypus import Paragraph, Table, TableStyle
from . import standards as s
from .typography import CELL, CELL_HEADER


def P(text) -> Paragraph:
    """Wrap body text into a Paragraph using the CELL style."""
    return Paragraph(str(text), CELL)


def PH(text) -> Paragraph:
    """Wrap header text into a Paragraph using the CELL_HEADER style."""
    return Paragraph(str(text), CELL_HEADER)


def bts(num_rows: int) -> list:
    """Generate the base table style tuple list.
    Function, not shared list — prevents row-index overflow bugs between docs.
    """
    st = [
        ("BACKGROUND", (0, 0), (-1, 0), s.SLATE),
        ("TEXTCOLOR", (0, 0), (-1, 0), s.WHITE),
        ("FONTNAME", (0, 0), (-1, 0), s.FONT_BOLD),
        ("FONTSIZE", (0, 0), (-1, 0), 7.5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.5, s.BORDER),
    ]
    for i in range(1, num_rows):
        if i % 2 == 0:
            st.append(("BACKGROUND", (0, i), (-1, i), s.OFF_WHITE))
    return st


def MT(data: list[list], col_widths: list[float]) -> Table:
    """Make a properly-wrapped Paragraph-celled Table.

    `data` is a list of rows where the first row is headers (raw strings OK),
    subsequent rows are body data. Strings are automatically wrapped.

    `col_widths` is a list of fractions summing to 1.0, applied to FRAME_W.
    """
    if abs(sum(col_widths) - 1.0) > 0.001:
        raise ValueError(f"col_widths must sum to 1.0, got {sum(col_widths)}")

    wrapped = []
    for row_idx, row in enumerate(data):
        wrapped.append([
            PH(cell) if row_idx == 0 else P(cell)
            for cell in row
        ])

    t = Table(wrapped, colWidths=[w * s.FRAME_W for w in col_widths])
    t.setStyle(TableStyle(bts(len(data))))
    return t
```

- [ ] **Step 2: Verify import works**

Run:

```bash
python -c "from dsig_pdf.tables import MT, P, PH, bts; print('ok')"
```

Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add dsig_pdf/tables.py
git commit -m "$(cat <<'EOF'
feat(tables): add MT() / P() / PH() / bts() helpers

Enforces the mandatory Paragraph-wrapped cell pattern from
DSIG_PDF_STANDARDS_v2. Raw strings in tables overflow the page;
MT() makes that impossible. bts() is a function (not a mutable list)
to avoid row-index overflow bugs between documents.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Components — ODiv, Callout, GradientBar, PaidStamp, VoidStamp

**Files:**
- Create: `dsig_pdf/components.py`
- Create: `tests/test_components.py`

- [ ] **Step 1: Write failing test `tests/test_components.py`**

```python
from io import BytesIO
from dsig_pdf.components import ODiv, Callout, PaidStamp, VoidStamp


def test_odiv_has_fixed_dimensions():
    d = ODiv()
    assert d.width == 60
    assert d.height == 4


def test_paid_stamp_default_text():
    st = PaidStamp()
    assert "PAID" in st.main_text


def test_paid_stamp_complimentary_variant():
    st = PaidStamp(variant="complimentary")
    assert "COMPLIMENTARY" in st.sub_text


def test_void_stamp_supersedes():
    st = VoidStamp(superseded_by_number="DSIG-2026-0008")
    assert "DSIG-2026-0008" in st.sub_text


def test_callout_renders_without_error():
    from reportlab.platypus import SimpleDocTemplate
    from reportlab.lib.pagesizes import legal
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=legal)
    c = Callout("Test Title", "Test body text.", variant="teal")
    # Callout must implement wrap() + draw()
    doc.build([c])
    assert buf.getvalue().startswith(b"%PDF")
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pytest tests/test_components.py -v
```

Expected: fails with `ModuleNotFoundError` or attribute errors.

- [ ] **Step 3: Create `dsig_pdf/components.py`**

```python
# ── Shared PDF flowable components ──────────────────────────────────

from reportlab.platypus import Flowable
from . import standards as s


class ODiv(Flowable):
    """Orange divider bar. 2pt × 60pt, placed under H1 headlines."""

    width = 60
    height = 4

    def wrap(self, *args):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColorRGB(*s.ORANGE_S)
        c.rect(0, 0, self.width, 2, fill=1, stroke=0)
        c.restoreState()


class GradientBar(Flowable):
    """80-step orange → teal gradient bar. Already painted on interior
    pages by layout._paint_interior; this flowable is for other contexts."""

    def __init__(self, width: float, height: float = 4):
        Flowable.__init__(self)
        self.width = width
        self.height = height

    def wrap(self, *args):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.saveState()
        orange_r, orange_g, orange_b = s.ORANGE_S
        teal_r, teal_g, teal_b = s.TEAL_S
        steps = 80
        step_w = self.width / steps
        for i in range(steps):
            t = i / (steps - 1)
            r = orange_r + (teal_r - orange_r) * t
            g = orange_g + (teal_g - orange_g) * t
            b = orange_b + (teal_b - orange_b) * t
            c.setFillColorRGB(r, g, b)
            c.rect(i * step_w, 0, step_w + 0.5, self.height, fill=1, stroke=0)
        c.restoreState()


class Callout(Flowable):
    """Info/recommendation callout. Orange or teal variant."""

    def __init__(self, title: str, body: str, variant: str = "teal"):
        Flowable.__init__(self)
        self.title = title
        self.body = body
        self.variant = variant
        self.width = s.FRAME_W

    def wrap(self, available_width, available_height):
        self.width = available_width
        self.height = 60  # fixed for now; dynamic sizing later if needed
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.saveState()
        bg = s.VLT if self.variant == "teal" else s.VLO
        border = s.TEAL_S if self.variant == "teal" else s.ORANGE_S
        c.setFillColorRGB(*bg)
        c.roundRect(0, 0, self.width, self.height, 4, fill=1, stroke=0)
        c.setStrokeColorRGB(*border)
        c.setLineWidth(3)
        c.line(0, 0, 0, self.height)
        c.setFillColorRGB(*s.SLATE)
        c.setFont(s.FONT_BOLD, 10)
        c.drawString(12, self.height - 18, self.title)
        c.setFillColorRGB(*s.BODY)
        c.setFont(s.FONT_BASE, 8.5)
        c.drawString(12, self.height - 34, self.body[:120])
        c.restoreState()


class PaidStamp(Flowable):
    """Diagonal PAID ✓ stamp overlay. Placed on invoice totals area."""

    def __init__(self, variant: str = "standard", paid_date: str | None = None):
        """variant: 'standard' | 'complimentary'"""
        Flowable.__init__(self)
        self.variant = variant
        self.main_text = "PAID ✓"
        if variant == "complimentary":
            self.sub_text = "COMPLIMENTARY"
        else:
            self.sub_text = paid_date or ""
        self.width = 240
        self.height = 80

    def wrap(self, *args):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.saveState()
        c.translate(self.width / 2, self.height / 2)
        c.rotate(-15)
        c.setFillColor(s.EMERALD_30)
        c.setStrokeColor(s.EMERALD_30)
        c.setLineWidth(4)
        c.roundRect(-self.width / 2 + 10, -self.height / 2 + 10,
                    self.width - 20, self.height - 20, 8, fill=0, stroke=1)
        c.setFont(s.FONT_BOLD, s.SIZE_STAMP)
        c.drawCentredString(0, 6, self.main_text)
        if self.sub_text:
            c.setFont(s.FONT_BOLD, 14)
            c.drawCentredString(0, -20, self.sub_text)
        c.restoreState()


class VoidStamp(Flowable):
    """Diagonal VOID stamp overlay. Placed on voided invoice totals."""

    def __init__(self, superseded_by_number: str | None = None):
        Flowable.__init__(self)
        self.main_text = "VOID"
        self.sub_text = (
            f"Superseded by {superseded_by_number}" if superseded_by_number else ""
        )
        self.width = 240
        self.height = 80

    def wrap(self, *args):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.saveState()
        c.translate(self.width / 2, self.height / 2)
        c.rotate(-15)
        c.setFillColor(s.RED_30)
        c.setStrokeColor(s.RED_30)
        c.setLineWidth(4)
        c.roundRect(-self.width / 2 + 10, -self.height / 2 + 10,
                    self.width - 20, self.height - 20, 8, fill=0, stroke=1)
        c.setFont(s.FONT_BOLD, s.SIZE_STAMP)
        c.drawCentredString(0, 6, self.main_text)
        if self.sub_text:
            c.setFont(s.FONT_BOLD, 11)
            c.drawCentredString(0, -20, self.sub_text)
        c.restoreState()
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pytest tests/test_components.py -v
```

Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add dsig_pdf/components.py tests/test_components.py
git commit -m "$(cat <<'EOF'
feat(components): add ODiv, GradientBar, Callout, PaidStamp, VoidStamp

Shared flowables consumed by every doc type. PaidStamp renders the
diagonal overlay on $0 Restaurant Rule invoices as 'PAID ✓ COMPLIMENTARY';
VoidStamp shows 'VOID / Superseded by DSIG-YYYY-NNNN' on voided docs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Famous quote library + seeded picker

**Files:**
- Create: `dsig_pdf/quotes.py`
- Create: `tests/test_quotes.py`

- [ ] **Step 1: Write failing test `tests/test_quotes.py`**

```python
from dsig_pdf.quotes import pick_quote, QUOTES


def test_every_quote_has_required_fields():
    for q in QUOTES:
        assert "text" in q and q["text"]
        assert "author" in q and q["author"]
        assert "fit" in q and isinstance(q["fit"], list)


def test_invoice_has_eligible_quotes():
    eligible = [q for q in QUOTES if "invoice" in q["fit"]]
    assert len(eligible) >= 5, "Need at least 5 invoice-eligible quotes for variety"


def test_pick_quote_is_deterministic_by_seed():
    a = pick_quote("invoice", seed="DSIG-2026-0007")
    b = pick_quote("invoice", seed="DSIG-2026-0007")
    assert a == b


def test_pick_quote_different_seeds_can_differ():
    # With 5+ eligible quotes, seed variation should at least sometimes differ
    results = {pick_quote("invoice", seed=f"SEED-{i}")["text"] for i in range(20)}
    assert len(results) > 1


def test_pick_quote_only_returns_eligible_for_doc_type():
    # If we ask for proposal, we should never get an invoice-only quote
    for i in range(20):
        q = pick_quote("proposal", seed=f"X-{i}")
        assert "proposal" in q["fit"]
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pytest tests/test_quotes.py -v
```

Expected: fails, no `dsig_pdf.quotes` module.

- [ ] **Step 3: Create `dsig_pdf/quotes.py`**

```python
# ── Famous quote library ────────────────────────────────────────────
# Rendered on the back cover of every DSIG PDF. Deterministic per seed
# so re-renders produce the same quote (invoice number = seed).

import hashlib

QUOTES = [
    {
        "text": "The best time to plant a tree was 20 years ago. The second best time is now.",
        "author": "Chinese proverb",
        "fit": ["proposal", "estimate", "sow", "invoice", "report"],
    },
    {
        "text": "Quality is not an act, it is a habit.",
        "author": "Aristotle",
        "fit": ["invoice", "sow", "report", "proposal"],
    },
    {
        "text": "If you can't measure it, you can't improve it.",
        "author": "Peter Drucker",
        "fit": ["seo_audit", "report", "estimate", "invoice"],
    },
    {
        "text": "People don't buy what you do, they buy why you do it.",
        "author": "Simon Sinek",
        "fit": ["proposal", "master_plan"],
    },
    {
        "text": "The details are not the details. They make the design.",
        "author": "Charles Eames",
        "fit": ["proposal", "sow", "invoice", "report", "estimate"],
    },
    {
        "text": "Simplicity is the ultimate sophistication.",
        "author": "Leonardo da Vinci",
        "fit": ["proposal", "invoice", "sow", "estimate"],
    },
    {
        "text": "Make it work, make it right, make it fast.",
        "author": "Kent Beck",
        "fit": ["project_plan", "sow", "report"],
    },
    {
        "text": "The function of good software is to make the complex appear simple.",
        "author": "Grady Booch",
        "fit": ["proposal", "sow", "master_plan", "invoice"],
    },
    {
        "text": "Your most unhappy customers are your greatest source of learning.",
        "author": "Bill Gates",
        "fit": ["report", "seo_audit", "proposal"],
    },
    {
        "text": "It always seems impossible until it's done.",
        "author": "Nelson Mandela",
        "fit": ["proposal", "estimate", "master_plan", "project_plan"],
    },
    {
        "text": "Well done is better than well said.",
        "author": "Benjamin Franklin",
        "fit": ["invoice", "sow", "report"],
    },
    {
        "text": "The way to get started is to quit talking and begin doing.",
        "author": "Walt Disney",
        "fit": ["proposal", "estimate", "project_plan"],
    },
    {
        "text": "Excellence is never an accident. It is always the result of high intention, sincere effort, and intelligent execution.",
        "author": "Aristotle",
        "fit": ["invoice", "sow", "master_plan", "report"],
    },
    {
        "text": "Simplicity is about subtracting the obvious and adding the meaningful.",
        "author": "John Maeda",
        "fit": ["proposal", "report", "sow"],
    },
    {
        "text": "What gets measured gets managed.",
        "author": "Peter Drucker",
        "fit": ["seo_audit", "report", "master_plan"],
    },
    {
        "text": "Great things are done by a series of small things brought together.",
        "author": "Vincent Van Gogh",
        "fit": ["invoice", "sow", "project_plan", "master_plan"],
    },
    {
        "text": "Innovation distinguishes between a leader and a follower.",
        "author": "Steve Jobs",
        "fit": ["proposal", "master_plan"],
    },
    {
        "text": "Perfection is not attainable, but if we chase perfection we can catch excellence.",
        "author": "Vince Lombardi",
        "fit": ["invoice", "sow", "report"],
    },
    {
        "text": "The secret of getting ahead is getting started.",
        "author": "Mark Twain",
        "fit": ["estimate", "proposal", "project_plan"],
    },
    {
        "text": "A goal without a plan is just a wish.",
        "author": "Antoine de Saint-Exupéry",
        "fit": ["sow", "master_plan", "project_plan", "estimate"],
    },
]


def pick_quote(doc_type: str, seed: str | None = None) -> dict:
    """Deterministically pick a quote eligible for doc_type.
    Same seed → same quote. Useful so re-renders don't shuffle."""
    eligible = [q for q in QUOTES if doc_type in q["fit"]]
    if not eligible:
        raise ValueError(f"No quotes fit doc_type={doc_type}")
    key = seed or doc_type
    digest = hashlib.sha256(key.encode("utf-8")).digest()
    idx = int.from_bytes(digest[:4], "big") % len(eligible)
    return eligible[idx]
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pytest tests/test_quotes.py -v
```

Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add dsig_pdf/quotes.py tests/test_quotes.py
git commit -m "$(cat <<'EOF'
feat(quotes): add famous-quote back cover library + seeded picker

20 starter quotes, tagged by which doc types they fit. SHA256-based
seeded selection so an invoice always renders the same quote across
re-renders. Grown over time as good ones are collected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Covers (FrontCover + BackCover)

**Files:**
- Create: `dsig_pdf/covers.py`

- [ ] **Step 1: Create `dsig_pdf/covers.py`**

```python
# ── Front + back cover flowables ────────────────────────────────────

from reportlab.platypus import Flowable
from . import standards as s
from .quotes import pick_quote


class FrontCover(Flowable):
    """Full-bleed slate cover page.

    Layout (per DSIG_PDF_STANDARDS_v2 §FRONT COVER):
      - Logo top-left (36pt height)
      - Eyebrow ~56% down page
      - Title block (44-52pt bold, alternating white + teal lines)
      - Orange divider
      - Tagline
      - 3-column meta grid
      - Footer: contact info left, status pill right
    """

    def __init__(
        self,
        eyebrow: str,
        title_line_1: str,
        title_line_2: str,
        tagline: str,
        meta: dict[str, str],
        status_pill: str | None = None,
        status_color: tuple[float, float, float] | None = None,
    ):
        Flowable.__init__(self)
        self.eyebrow = eyebrow
        self.title_line_1 = title_line_1
        self.title_line_2 = title_line_2
        self.tagline = tagline
        self.meta = meta
        self.status_pill = status_pill
        self.status_color = status_color or s.ORANGE_S
        self.width = s.PAGE_W
        self.height = s.PAGE_H

    def wrap(self, *args):
        return self.width, self.height

    def draw(self):
        # Background + circles are painted by layout._paint_cover.
        c = self.canv
        c.saveState()

        # Logo placeholder (real logo requires drawImage with fetched asset;
        # placeholder wordmark here to keep the service self-contained for v1)
        c.setFillColorRGB(*s.WHITE)
        c.setFont(s.FONT_BOLD, 16)
        c.drawString(s.MARGIN, s.PAGE_H - s.MARGIN - 16, "DEMAND SIGNALS")

        # Eyebrow
        c.setFillColorRGB(*s.GRAY)
        c.setFont(s.FONT_BASE, 8)
        eyebrow_spaced = "   ".join(self.eyebrow.upper())
        c.drawString(s.MARGIN, s.PAGE_H * 0.44, eyebrow_spaced)

        # Title block
        c.setFillColorRGB(*s.WHITE)
        c.setFont(s.FONT_BOLD, 48)
        c.drawString(s.MARGIN, s.PAGE_H * 0.44 - 56, self.title_line_1)
        c.setFillColorRGB(*s.TEAL_S)
        c.drawString(s.MARGIN, s.PAGE_H * 0.44 - 108, self.title_line_2)

        # Orange divider
        c.setFillColorRGB(*s.ORANGE_S)
        c.rect(s.MARGIN, s.PAGE_H * 0.44 - 130, 60, 2, fill=1, stroke=0)

        # Tagline
        c.setFillColorRGB(*s.CCCC)
        c.setFont(s.FONT_BASE, 11)
        c.drawString(s.MARGIN, s.PAGE_H * 0.44 - 150, self.tagline)

        # Meta grid
        meta_y = s.PAGE_H * 0.20
        col_w = s.FRAME_W / max(1, len(self.meta))
        for i, (label, value) in enumerate(self.meta.items()):
            x = s.MARGIN + i * col_w
            c.setFillColorRGB(*s.GRAY)
            c.setFont(s.FONT_BASE, 7)
            c.drawString(x, meta_y, label.upper())
            c.setFillColorRGB(*s.WHITE)
            c.setFont(s.FONT_BOLD, 12)
            c.drawString(x, meta_y - 18, value)

        # Footer — contact left
        c.setFillColorRGB(*s.GRAY)
        c.setFont(s.FONT_BASE, 8)
        c.drawString(s.MARGIN, s.MARGIN, "DemandSignals.co  |  (916) 542-2423")

        # Status pill right
        if self.status_pill:
            pill_text = self.status_pill
            c.setFont(s.FONT_BOLD, 9)
            text_w = c.stringWidth(pill_text, s.FONT_BOLD, 9)
            pill_w = text_w + 24
            pill_h = 18
            pill_x = s.PAGE_W - s.MARGIN - pill_w
            pill_y = s.MARGIN - 2
            c.setFillColorRGB(*self.status_color)
            c.roundRect(pill_x, pill_y, pill_w, pill_h, 9, fill=1, stroke=0)
            c.setFillColorRGB(*s.WHITE)
            c.drawCentredString(pill_x + pill_w / 2, pill_y + 5, pill_text)

        c.restoreState()


class BackCover(Flowable):
    """Full-bleed slate back cover.

    Layout (per DSIG_PDF_STANDARDS_v2 §BACK COVER):
      - Logo centered ~60% down (40pt height)
      - Famous quote (italic, teal, centered)
      - Attribution under quote
      - Headline (white + teal alternating)
      - Subtext
      - Orange pill CTA
      - 3-column contact grid
      - Attribution + copyright
    """

    def __init__(
        self,
        doc_type: str,
        seed: str | None = None,
        headline_line_1: str = "Thank you for trusting",
        headline_line_2: str = "Demand Signals",
        cta_text: str = "QUESTIONS? GET IN TOUCH →",
    ):
        Flowable.__init__(self)
        self.quote = pick_quote(doc_type, seed=seed)
        self.headline_line_1 = headline_line_1
        self.headline_line_2 = headline_line_2
        self.cta_text = cta_text
        self.width = s.PAGE_W
        self.height = s.PAGE_H

    def wrap(self, *args):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.saveState()

        # Logo wordmark centered ~60% down
        c.setFillColorRGB(*s.WHITE)
        c.setFont(s.FONT_BOLD, 18)
        c.drawCentredString(s.PAGE_W / 2, s.PAGE_H * 0.60, "DEMAND SIGNALS")

        # Famous quote
        c.setFillColorRGB(*s.TEAL_S)
        c.setFont("Helvetica-Oblique", 14)
        quote_y = s.PAGE_H * 0.52
        # Word-wrap at ~70 chars
        words = self.quote["text"].split()
        lines = []
        cur = ""
        for w in words:
            trial = (cur + " " + w).strip()
            if len(trial) > 70:
                lines.append(cur)
                cur = w
            else:
                cur = trial
        lines.append(cur)
        for i, line in enumerate(lines):
            c.drawCentredString(s.PAGE_W / 2, quote_y - i * 20, f"\u201c{line}\u201d" if i == 0 else line)
        # Attribution
        c.setFillColorRGB(*s.GRAY)
        c.setFont(s.FONT_BASE, 8)
        c.drawCentredString(s.PAGE_W / 2, quote_y - len(lines) * 20 - 8,
                            f"— {self.quote['author']}")

        # Headline
        c.setFillColorRGB(*s.WHITE)
        c.setFont(s.FONT_BOLD, 30)
        c.drawCentredString(s.PAGE_W / 2, s.PAGE_H * 0.35, self.headline_line_1)
        c.setFillColorRGB(*s.TEAL_S)
        c.drawCentredString(s.PAGE_W / 2, s.PAGE_H * 0.35 - 34, self.headline_line_2)

        # CTA pill
        c.setFont(s.FONT_BOLD, 11)
        cta_w = c.stringWidth(self.cta_text, s.FONT_BOLD, 11) + 40
        cta_x = (s.PAGE_W - cta_w) / 2
        cta_y = s.PAGE_H * 0.24
        c.setFillColorRGB(*s.ORANGE_S)
        c.roundRect(cta_x, cta_y, cta_w, 28, 14, fill=1, stroke=0)
        c.setFillColorRGB(*s.WHITE)
        c.drawCentredString(s.PAGE_W / 2, cta_y + 9, self.cta_text)

        # Contact grid (3 columns centered)
        contacts = [
            ("EMAIL", "DemandSignals@gmail.com"),
            ("PHONE", "(916) 542-2423"),
            ("WEB", "DemandSignals.co"),
        ]
        grid_y = s.PAGE_H * 0.15
        col_w = s.PAGE_W / 3
        for i, (label, value) in enumerate(contacts):
            cx = col_w / 2 + i * col_w
            c.setFillColorRGB(*s.GRAY)
            c.setFont(s.FONT_BASE, 7)
            c.drawCentredString(cx, grid_y, label)
            c.setFillColorRGB(*s.WHITE)
            c.setFont(s.FONT_BOLD, 11)
            c.drawCentredString(cx, grid_y - 16, value)

        # Attribution + copyright
        c.setFillColorRGB(*s.GRAY)
        c.setFont(s.FONT_BASE, 9)
        c.drawCentredString(
            s.PAGE_W / 2, s.PAGE_H * 0.07,
            "Prepared by Demand Signals — Digital Growth & Strategy",
        )
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.setFont(s.FONT_BASE, 8)
        c.drawCentredString(s.PAGE_W / 2, s.PAGE_H * 0.05,
                            "© 2026 Demand Signals. Confidential.")

        c.restoreState()
```

- [ ] **Step 2: Verify import works**

Run:

```bash
python -c "from dsig_pdf.covers import FrontCover, BackCover; print('ok')"
```

Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add dsig_pdf/covers.py
git commit -m "$(cat <<'EOF'
feat(covers): FrontCover + BackCover flowables

Full-bleed slate backgrounds, decorative circles painted by layout.
BackCover picks contextually-relevant famous quote via quotes.pick_quote(
doc_type, seed=...) — deterministic per seed so re-renders don't shuffle.

Logo rendered as wordmark for v1 (no external fetch); upgrade to image
drawImage when convenient.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Invoice doc type

**Files:**
- Create: `dsig_pdf/docs/__init__.py`
- Create: `dsig_pdf/docs/invoice.py`
- Create: `tests/fixtures/sample_invoice.json`
- Create: `tests/test_invoice_render.py`

- [ ] **Step 1: Create `dsig_pdf/docs/__init__.py`**

Empty file.

- [ ] **Step 2: Create `tests/fixtures/sample_invoice.json`**

```json
{
  "doc_type": "invoice",
  "version": 1,
  "data": {
    "invoice_number": "DSIG-2026-0007",
    "issue_date": "2026-04-18",
    "due_date": "2026-05-02",
    "status": "paid",
    "is_paid": true,
    "is_void": false,
    "is_zero_balance": true,
    "supersedes_number": null,
    "superseded_by_number": null,
    "bill_to": {
      "business_name": "Creekside Endodontics",
      "contact_name": "Dr. Jane Smith",
      "email": "jane@creeksideendo.com"
    },
    "line_items": [
      { "description": "Market Research", "quantity": 1, "unit_price_cents": 50000, "line_total_cents": 50000 },
      { "description": "Competitor Analysis", "quantity": 1, "unit_price_cents": 50000, "line_total_cents": 50000 },
      { "description": "Site Audit", "quantity": 1, "unit_price_cents": 40000, "line_total_cents": 40000 },
      { "description": "Social Audit", "quantity": 1, "unit_price_cents": 35000, "line_total_cents": 35000 },
      { "description": "Introductory Research Credit (100% off)", "quantity": 1, "unit_price_cents": -175000, "line_total_cents": -175000 }
    ],
    "subtotal_cents": 175000,
    "discount_cents": 175000,
    "total_due_cents": 0,
    "notes": "This research is complimentary. Your investment comes later, only if you choose to move forward with implementation."
  }
}
```

- [ ] **Step 3: Write failing test `tests/test_invoice_render.py`**

```python
import json
from io import BytesIO
from pathlib import Path
from pypdf import PdfReader
from dsig_pdf.docs.invoice import render


FIXTURE = Path(__file__).parent / "fixtures" / "sample_invoice.json"


def load_fixture():
    with open(FIXTURE) as f:
        return json.load(f)["data"]


def test_invoice_renders_valid_pdf():
    data = load_fixture()
    pdf_bytes = render(data)
    assert pdf_bytes.startswith(b"%PDF")
    reader = PdfReader(BytesIO(pdf_bytes))
    assert len(reader.pages) == 3  # cover + interior + back


def test_invoice_contains_invoice_number():
    data = load_fixture()
    pdf_bytes = render(data)
    reader = PdfReader(BytesIO(pdf_bytes))
    text = "\n".join(p.extract_text() or "" for p in reader.pages)
    assert "DSIG-2026-0007" in text


def test_invoice_contains_business_name():
    data = load_fixture()
    pdf_bytes = render(data)
    reader = PdfReader(BytesIO(pdf_bytes))
    text = "\n".join(p.extract_text() or "" for p in reader.pages)
    assert "Creekside Endodontics" in text


def test_zero_balance_has_paid_stamp_text():
    data = load_fixture()
    pdf_bytes = render(data)
    reader = PdfReader(BytesIO(pdf_bytes))
    text = "\n".join(p.extract_text() or "" for p in reader.pages)
    assert "PAID" in text
    assert "COMPLIMENTARY" in text


def test_back_cover_has_quote():
    data = load_fixture()
    pdf_bytes = render(data)
    reader = PdfReader(BytesIO(pdf_bytes))
    # Last page = back cover; quote author appears
    text = reader.pages[-1].extract_text() or ""
    assert "—" in text  # the dash before author


def test_render_accepts_standard_paid_invoice():
    data = load_fixture()
    data["is_zero_balance"] = False
    data["total_due_cents"] = 250000
    data["discount_cents"] = 0
    pdf_bytes = render(data)
    reader = PdfReader(BytesIO(pdf_bytes))
    text = "\n".join(p.extract_text() or "" for p in reader.pages)
    assert "PAID" in text
    assert "COMPLIMENTARY" not in text  # standard paid doesn't get complimentary variant


def test_render_voided_invoice():
    data = load_fixture()
    data["status"] = "void"
    data["is_paid"] = False
    data["is_void"] = True
    data["superseded_by_number"] = "DSIG-2026-0008"
    pdf_bytes = render(data)
    reader = PdfReader(BytesIO(pdf_bytes))
    text = "\n".join(p.extract_text() or "" for p in reader.pages)
    assert "VOID" in text
    assert "DSIG-2026-0008" in text
```

- [ ] **Step 4: Run test to verify it fails**

Run:

```bash
pytest tests/test_invoice_render.py -v
```

Expected: fails, no `dsig_pdf.docs.invoice` module.

- [ ] **Step 5: Create `dsig_pdf/docs/invoice.py`**

```python
# ── Invoice PDF doc type ────────────────────────────────────────────
#
# Consumes the data payload from POST /api/render with doc_type='invoice'.
# Emits a 3-page PDF: cover + interior (line items) + back cover.

from io import BytesIO
from reportlab.platypus import Paragraph, Spacer, NextPageTemplate, PageBreak
from reportlab.lib.units import inch

from .. import standards as s
from ..layout import make_doc
from ..typography import EYEBROW, H1, BODY, BODY_SMALL
from ..tables import MT
from ..components import ODiv, Callout, PaidStamp, VoidStamp
from ..covers import FrontCover, BackCover


def _format_cents(cents: int) -> str:
    """Format cents to $X,XXX.XX string, negatives as -$X,XXX.XX."""
    sign = "-" if cents < 0 else ""
    abs_cents = abs(cents)
    dollars = abs_cents // 100
    pennies = abs_cents % 100
    return f"{sign}${dollars:,}.{pennies:02d}"


def render(data: dict) -> bytes:
    """Render an invoice dict to a PDF byte stream."""
    buf = BytesIO()
    doc = make_doc(buf)
    story = []

    # ── Page 1: Front cover ────────────────────────────────────────
    if data.get("is_void"):
        status_pill = "VOID"
        status_color = s.RED
    elif data.get("is_paid"):
        status_pill = "PAID"
        status_color = s.EMERALD
    else:
        status_pill = "DUE"
        status_color = s.ORANGE_S

    story.append(FrontCover(
        eyebrow="INVOICE",
        title_line_1="INVOICE",
        title_line_2=data["invoice_number"],
        tagline="Professional services — Demand Signals",
        meta={
            "Prepared For": data["bill_to"]["business_name"],
            "Issue Date": data["issue_date"],
            "Total Due": _format_cents(data["total_due_cents"]),
        },
        status_pill=status_pill,
        status_color=status_color,
    ))

    story.append(NextPageTemplate("interior"))
    story.append(PageBreak())

    # ── Page 2: Interior — line items ──────────────────────────────
    story.append(Paragraph("L I N E   I T E M S", EYEBROW))
    story.append(Paragraph("Invoice Detail", H1))
    story.append(ODiv())
    story.append(Spacer(1, 12))

    # Bill-to block
    bt = data["bill_to"]
    bill_lines = [bt.get("business_name", "")]
    if bt.get("contact_name"):
        bill_lines.append(bt["contact_name"])
    if bt.get("email"):
        bill_lines.append(bt["email"])
    story.append(Paragraph("<b>Bill To:</b><br/>" + "<br/>".join(bill_lines), BODY))
    story.append(Spacer(1, 12))

    # Line items table
    table_data = [["Description", "Qty", "Unit", "Amount"]]
    for item in data["line_items"]:
        table_data.append([
            item["description"],
            str(item["quantity"]),
            _format_cents(item["unit_price_cents"]),
            _format_cents(item["line_total_cents"]),
        ])
    story.append(MT(table_data, [0.55, 0.10, 0.15, 0.20]))
    story.append(Spacer(1, 18))

    # Totals block (simple right-aligned paragraphs)
    totals_html = (
        f'<para align="right">'
        f'Subtotal: {_format_cents(data["subtotal_cents"])}<br/>'
    )
    if data["discount_cents"]:
        totals_html += f'Discount: -{_format_cents(data["discount_cents"])}<br/>'
    totals_html += f'<b>TOTAL DUE: {_format_cents(data["total_due_cents"])}</b></para>'
    story.append(Paragraph(totals_html, BODY))
    story.append(Spacer(1, 12))

    # Stamp overlay
    if data.get("is_paid"):
        variant = "complimentary" if data.get("is_zero_balance") else "standard"
        paid_date = data.get("issue_date") if variant == "standard" else None
        story.append(PaidStamp(variant=variant, paid_date=paid_date))
    elif data.get("is_void"):
        story.append(VoidStamp(superseded_by_number=data.get("superseded_by_number")))

    story.append(Spacer(1, 18))

    # Notes callout
    if data.get("notes"):
        story.append(Callout("Notes", data["notes"], variant="teal"))

    story.append(NextPageTemplate("back"))
    story.append(PageBreak())

    # ── Page 3: Back cover with famous quote ───────────────────────
    story.append(BackCover(
        doc_type="invoice",
        seed=data["invoice_number"],
    ))

    doc.build(story)
    return buf.getvalue()
```

- [ ] **Step 6: Run test to verify it passes**

Run:

```bash
pytest tests/test_invoice_render.py -v
```

Expected: `7 passed`. If any text-extraction test fails with "PAID not found", verify the stamp renders by inspecting the PDF manually:

```bash
python -c "
from dsig_pdf.docs.invoice import render
import json
with open('tests/fixtures/sample_invoice.json') as f:
    data = json.load(f)['data']
with open('sample-output.pdf', 'wb') as f:
    f.write(render(data))
print('wrote sample-output.pdf')
"
```

Open `sample-output.pdf` in a viewer and verify visually. Delete after inspection (it's gitignored).

- [ ] **Step 7: Commit**

```bash
git add dsig_pdf/docs/__init__.py dsig_pdf/docs/invoice.py tests/fixtures/sample_invoice.json tests/test_invoice_render.py
git commit -m "$(cat <<'EOF'
feat(invoice): first doc type — 3-page branded invoice

Cover (slate + status pill) → interior (eyebrow, H1, line items table,
totals, stamp overlay, notes callout) → back cover (famous quote + CTA).

Supports paid / $0-complimentary / void variants. Reuses all shared
components — invoice-specific code is ~80 lines total.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: API handler

**Files:**
- Create: `api/__init__.py`
- Create: `api/render.py`

- [ ] **Step 1: Create `api/__init__.py`**

Empty file.

- [ ] **Step 2: Create `api/render.py`**

```python
# ── Vercel serverless entry point ───────────────────────────────────
#
# POST /api/render
#
# Request:
#   Authorization: Bearer <PDF_SERVICE_SECRET>
#   Content-Type: application/json
#   Body: {"doc_type": "invoice", "version": 1, "data": {...}}
#
# Response: 200 application/pdf with PDF bytes

import json
import os
from http.server import BaseHTTPRequestHandler

from dsig_pdf.docs import invoice as invoice_doc


DOC_RENDERERS = {
    "invoice": invoice_doc.render,
    # Future: "proposal": proposal_doc.render, "sow": sow_doc.render, etc.
}


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # ── Auth ────────────────────────────────────────────────
        expected = os.environ.get("PDF_SERVICE_SECRET")
        if not expected:
            self._error(500, "PDF_SERVICE_SECRET not configured")
            return

        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            self._error(401, "Missing bearer token")
            return
        token = auth[len("Bearer "):].strip()
        if token != expected:
            self._error(401, "Invalid bearer token")
            return

        # ── Parse body ──────────────────────────────────────────
        length = int(self.headers.get("Content-Length") or 0)
        if length == 0:
            self._error(400, "Empty body")
            return

        try:
            payload = json.loads(self.rfile.read(length))
        except json.JSONDecodeError as e:
            self._error(400, f"Invalid JSON: {e}")
            return

        doc_type = payload.get("doc_type")
        data = payload.get("data")
        if not doc_type or not isinstance(data, dict):
            self._error(400, "Body must include doc_type + data (object)")
            return

        renderer = DOC_RENDERERS.get(doc_type)
        if not renderer:
            self._error(400, f"Unknown doc_type: {doc_type}")
            return

        # ── Render ───────────────────────────────────────────────
        try:
            pdf_bytes = renderer(data)
        except KeyError as e:
            self._error(400, f"Missing required field in data: {e}")
            return
        except Exception as e:
            self._error(500, f"Render failed: {type(e).__name__}: {e}")
            return

        # ── Respond ──────────────────────────────────────────────
        self.send_response(200)
        self.send_header("Content-Type", "application/pdf")
        self.send_header("Content-Length", str(len(pdf_bytes)))
        self.send_header(
            "Content-Disposition",
            f'inline; filename="{doc_type}.pdf"',
        )
        self.end_headers()
        self.wfile.write(pdf_bytes)

    def _error(self, code: int, message: str):
        body = json.dumps({"error": message}).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
```

- [ ] **Step 3: Commit**

```bash
git add api/__init__.py api/render.py
git commit -m "$(cat <<'EOF'
feat(api): add POST /api/render endpoint

Bearer-token auth via PDF_SERVICE_SECRET. Dispatches to doc_type
renderer (invoice shipped; proposal/sow/etc. register as they land).
Returns application/pdf bytes. 400/401/500 JSON errors otherwise.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Deploy to Vercel + smoke test

**Files:** (none created; operational task)

- [ ] **Step 1: Push to GitHub**

```bash
git branch -M main
git remote add origin git@github.com:demand-signals/dsig-pdf-service.git
git push -u origin main
```

Expected: Vercel auto-detects the push and deploys the project. Check the Vercel dashboard for build logs — build succeeds when `requirements.txt` installs cleanly.

- [ ] **Step 2: Wait for Vercel deploy to finish**

Watch the Vercel dashboard. Deploy should complete in ~2 minutes. Note the deployment URL (e.g., `https://dsig-pdf-service-xxx.vercel.app`).

- [ ] **Step 3: Smoke test against the deployed endpoint**

Replace `<SECRET>` with the `PDF_SERVICE_SECRET` value:

```bash
curl -X POST "https://pdf.demandsignals.co/api/render" \
  -H "Authorization: Bearer <SECRET>" \
  -H "Content-Type: application/json" \
  --data @tests/fixtures/sample_invoice.json \
  -o smoke.pdf

file smoke.pdf
```

Expected: `smoke.pdf: PDF document, version 1.4` (or similar). Opening `smoke.pdf` shows a 3-page DSIG-branded invoice.

If the custom domain isn't resolving yet, fall back to the Vercel URL for this smoke test and retry `pdf.demandsignals.co` once DNS propagates.

- [ ] **Step 4: Test auth rejection**

```bash
curl -X POST "https://pdf.demandsignals.co/api/render" \
  -H "Authorization: Bearer wrong-token" \
  -H "Content-Type: application/json" \
  --data @tests/fixtures/sample_invoice.json
```

Expected: HTTP 401 with `{"error":"Invalid bearer token"}`.

- [ ] **Step 5: Delete local smoke.pdf**

```bash
rm smoke.pdf
```

(It's gitignored, but tidy up.)

- [ ] **Step 6: No commit for this task**

Deployment verification — no code changes.

---

## Task 12: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run tests
        run: pytest -v
```

- [ ] **Step 2: Commit + push**

```bash
git add .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
chore(ci): add GitHub Actions pytest workflow

Runs on every push to main and every PR. Installs requirements.txt
then runs pytest -v. Fast check that shared standards + components
don't regress as new doc types are added.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
```

Expected: CI runs on the push, passes within ~1 minute. Badge optional (can add to README later).

---

## Self-Review Checklist

- [ ] All 12 tasks have exact file paths in every "Files" block
- [ ] No "TBD" / placeholder text in any step
- [ ] Function/class names consistent across tasks:
      `FrontCover`, `BackCover`, `ODiv`, `Callout`, `PaidStamp`, `VoidStamp`,
      `pick_quote`, `make_doc`, `render`, `MT`, `P`, `PH`, `bts`
- [ ] `standards.py` exports used by `layout.py`, `typography.py`, `components.py`, `covers.py`, `docs/invoice.py` are all defined
- [ ] Font name consistency: `Helvetica` (base), `Helvetica-Bold` (bold), `Helvetica-Oblique` (italic for quote) — all built-in reportlab
- [ ] Color constant consistency: `SLATE`, `TEAL_S`, `ORANGE_S`, `EMERALD`, `RED`, `GRAY`, `WHITE`, `CCCC` referenced across files all exist in `standards.py`
- [ ] Each task ends in a commit with proper message (except operational tasks 4+11 which don't need commits)
- [ ] Scope check: this plan delivers the PDF service. It does NOT deliver R2 integration (that's plan 1) or the invoicing consumer in the main repo (that's plan 3).

---

## What this plan does NOT do

- Does NOT fetch the real DSIG logo image (v1 renders a wordmark; logo drawImage upgrade is a follow-up)
- Does NOT implement proposal/SOW/estimate/report/audit doc types (each is a follow-up adding one file in `dsig_pdf/docs/`)
- Does NOT add StatRow, Timeline, ScoreGauge, ArchDiagram, CostCompare components (invoice doesn't need them; add when first consumer requires)
- Does NOT integrate with the main `demandsignals-next` repo (plan 3 wires the HTTP call)
- Does NOT add rate limiting at the service level (relied on as internal-only via bearer secret; add proper limiting if we ever expose it)
- Does NOT add observability / logging to external service (Vercel logs are sufficient for v1)
