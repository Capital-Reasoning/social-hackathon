from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output/pdf/mealflo_hackathon_writeup_mealflo_style.pdf"
FONT_DIR = ROOT / "design/fonts"
ICON_DIR = ROOT / "design/assets/icons"

PAGE_W, PAGE_H = landscape(letter)
MARGIN_X = 36
TOP_BAR_H = 48


@dataclass(frozen=True)
class Palette:
    bg: colors.Color = colors.HexColor("#fffdf0")
    surface: colors.Color = colors.HexColor("#ffffff")
    surface_tint: colors.Color = colors.HexColor("#fdf8e4")
    blue_tint: colors.Color = colors.HexColor("#f0f3ff")
    yellow: colors.Color = colors.HexColor("#fae278")
    yellow_100: colors.Color = colors.HexColor("#fef9d4")
    blue: colors.Color = colors.HexColor("#7890fa")
    action: colors.Color = colors.HexColor("#3d5cf5")
    navy: colors.Color = colors.HexColor("#1c1c2e")
    ink: colors.Color = colors.HexColor("#1c1c2e")
    mid: colors.Color = colors.HexColor("#4e4e72")
    muted: colors.Color = colors.HexColor("#6d7894")
    line: colors.Color = colors.Color(24 / 255, 24 / 255, 60 / 255, alpha=0.14)
    line_strong: colors.Color = colors.Color(24 / 255, 24 / 255, 60 / 255, alpha=0.24)
    success: colors.Color = colors.HexColor("#4ead6f")
    warning: colors.Color = colors.HexColor("#f0a830")
    red: colors.Color = colors.HexColor("#e05050")


P = Palette()


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Outfit", str(FONT_DIR / "Outfit-VariableFont_wght.ttf")))
    pdfmetrics.registerFont(TTFont("DMSans", str(FONT_DIR / "DMSans-VariableFont_opsz_wght.ttf")))
    pdfmetrics.registerFont(TTFont("DMSansItalic", str(FONT_DIR / "DMSans-Italic-VariableFont_opsz_wght.ttf")))


def swatch(c: canvas.Canvas, color: colors.Color) -> None:
    c.setFillColor(color)
    c.setStrokeColor(color)


def stroke(c: canvas.Canvas, color: colors.Color = P.line, width: float = 1.1) -> None:
    c.setStrokeColor(color)
    c.setLineWidth(width)


def round_rect(
    c: canvas.Canvas,
    x: float,
    y: float,
    w: float,
    h: float,
    r: float = 10,
    fill: colors.Color | None = None,
    border: colors.Color | None = None,
    width: float = 1.1,
) -> None:
    c.saveState()
    if fill is None:
        c.setFillColor(colors.Color(0, 0, 0, alpha=0))
    else:
        c.setFillColor(fill)
    if border is None:
        c.setStrokeColor(colors.Color(0, 0, 0, alpha=0))
        c.setLineWidth(0)
    else:
        c.setStrokeColor(border)
        c.setLineWidth(width)
    c.roundRect(x, y, w, h, r, stroke=1 if border else 0, fill=1 if fill else 0)
    c.restoreState()


def text(
    c: canvas.Canvas,
    value: str,
    x: float,
    y: float,
    size: float = 10,
    font: str = "DMSans",
    color: colors.Color = P.ink,
    align: str = "left",
) -> None:
    c.setFont(font, size)
    c.setFillColor(color)
    if align == "center":
        c.drawCentredString(x, y, value)
    elif align == "right":
        c.drawRightString(x, y, value)
    else:
        c.drawString(x, y, value)


def wrap_lines(value: str, font: str, size: float, width: float) -> list[str]:
    words = value.split()
    lines: list[str] = []
    line = ""
    for word in words:
        trial = word if not line else f"{line} {word}"
        if pdfmetrics.stringWidth(trial, font, size) <= width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def paragraph(
    c: canvas.Canvas,
    value: str,
    x: float,
    y: float,
    width: float,
    size: float = 9.3,
    font: str = "DMSans",
    color: colors.Color = P.ink,
    leading: float | None = None,
    max_lines: int | None = None,
) -> float:
    if leading is None:
        leading = size * 1.34
    lines: list[str] = []
    for para_index, part in enumerate(value.split("\n")):
        if part.strip():
            lines.extend(wrap_lines(part.strip(), font, size, width))
        if para_index != len(value.split("\n")) - 1:
            lines.append("")
    if max_lines is not None and len(lines) > max_lines:
        lines = lines[:max_lines]
        if lines:
            while pdfmetrics.stringWidth(lines[-1] + "...", font, size) > width and lines[-1]:
                lines[-1] = lines[-1][:-1].rstrip()
            lines[-1] = lines[-1] + "..."
    c.setFont(font, size)
    c.setFillColor(color)
    yy = y
    for line in lines:
        c.drawString(x, yy, line)
        yy -= leading
    return yy


def label(c: canvas.Canvas, value: str, x: float, y: float, color: colors.Color = P.action) -> None:
    text(c, value.upper(), x, y, 8.2, "DMSans", color)


def icon(c: canvas.Canvas, name: str, x: float, y: float, size: float = 24) -> None:
    path = ICON_DIR / name
    img = ImageReader(str(path))
    c.drawImage(img, x, y, width=size, height=size, mask="auto", preserveAspectRatio=True)


def circle_icon(c: canvas.Canvas, name: str, x: float, y: float, size: float = 28, bg: colors.Color = P.yellow_100) -> None:
    c.saveState()
    c.setFillColor(bg)
    c.circle(x + size / 2, y + size / 2, size / 2, stroke=0, fill=1)
    c.restoreState()
    icon(c, name, x + size * 0.2, y + size * 0.2, size * 0.6)


def top_bar(c: canvas.Canvas, active: str = "Dashboard") -> None:
    c.saveState()
    swatch(c, P.bg)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    swatch(c, P.yellow)
    c.rect(0, PAGE_H - 16, PAGE_W, 16, stroke=0, fill=1)
    swatch(c, P.yellow_100)
    c.roundRect(PAGE_W - 188, PAGE_H - 124, 170, 114, 28, stroke=0, fill=1)
    x, y = MARGIN_X, PAGE_H - 62
    round_rect(c, x, y, PAGE_W - 2 * MARGIN_X, TOP_BAR_H, 18, P.surface, P.line, 1.1)
    c.setFillColor(P.yellow)
    c.circle(x + 24, y + TOP_BAR_H / 2, 11, stroke=0, fill=1)
    text(c, "mealflo", x + 42, y + 17, 15, "Outfit", P.navy)
    nav = ["Dashboard", "Inbox", "Routes", "Inventory"]
    nx = x + 152
    for item in nav:
        w = 66 if item != "Inventory" else 78
        fill = P.navy if item == active else P.blue_tint
        border = None if item == active else P.line
        round_rect(c, nx, y + 10, w, 28, 13, fill, border)
        text(c, item, nx + w / 2, y + 18, 8, "DMSans", P.surface if item == active else P.navy, "center")
        nx += w + 8
    ax = PAGE_W - MARGIN_X - 250
    for button, width in [("+ Add request", 74), ("+ Add volunteer", 88), ("Reset demo", 70)]:
        round_rect(c, ax, y + 10, width, 28, 13, P.surface_tint if "volunteer" in button else P.blue_tint, P.line)
        text(c, button, ax + width / 2, y + 18, 7.8, "DMSans", P.navy, "center")
        ax += width + 8
    text(c, "ADMIN VIEW", PAGE_W - MARGIN_X - 10, y + 40, 7.5, "DMSans", P.action, "right")
    c.restoreState()


def footer(c: canvas.Canvas, page: int) -> None:
    stroke(c, P.line)
    c.line(MARGIN_X, 30, PAGE_W - MARGIN_X, 30)
    text(c, "Mealflo Hackathon Writeup", MARGIN_X, 18, 6.6, "DMSans", P.muted)
    text(c, str(page), PAGE_W - MARGIN_X, 18, 7.2, "DMSans", P.muted, "right")


def hero_metrics(c: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    round_rect(c, x, y, w, h, 18, P.blue_tint, P.line)
    metrics = [
        ("checklist.png", "4 items", "Waiting for review"),
        ("grocery-bag.png", "23 requests", "Ready today"),
        ("route-road.png", "5 routes", "Ready to assign"),
        ("meal-container.png", "100 meals", "Ready for delivery"),
    ]
    col_w = w / 4
    for idx, (img, main, sub) in enumerate(metrics):
        cx = x + idx * col_w
        if idx:
            stroke(c, P.line)
            c.line(cx, y + 13, cx, y + h - 13)
        circle_icon(c, img, cx + 12, y + h - 35, 26)
        text(c, main, cx + 45, y + h - 25, 11.2, "Outfit", P.navy)
        text(c, sub, cx + 45, y + h - 38, 7.4, "DMSans", P.muted)


def hero_flow(c: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    round_rect(c, x, y, w, h, 18, P.blue_tint, P.line)
    items = ["Requests", "Meals", "Routes", "Delivery"]
    item_w = 54
    gap = (w - (len(items) * item_w)) / (len(items) - 1)
    start_x = x + 18
    for idx, item in enumerate(items):
        bx = start_x + idx * (item_w + gap)
        round_rect(c, bx, y + 24, item_w, 24, 12, P.surface, P.line)
        text(c, item, bx + item_w / 2, y + 33, 7.8, "DMSans", P.navy, "center")
        if idx < len(items) - 1:
            stroke(c, P.line_strong)
            c.line(bx + item_w, y + 36, bx + item_w + gap, y + 36)
    text(c, "Structured work from intake to doorstep", x + w / 2, y + 9, 8.2, "DMSans", P.muted, "center")


def page_one(c: canvas.Canvas) -> None:
    top_bar(c)
    content_top = PAGE_H - 120
    x = MARGIN_X
    w = PAGE_W - 2 * MARGIN_X
    round_rect(c, x, content_top - 120, w, 118, 18, P.surface, P.line)
    c.setFillColor(P.yellow)
    c.roundRect(x, content_top - 120, 8, 118, 4, stroke=0, fill=1)
    label(c, "Track 2 / Food Security Delivery Operations", x + 22, content_top - 36)
    text(c, "Mealflo Hackathon Writeup", x + 22, content_top - 78, 27, "Outfit", P.navy)
    paragraph(
        c,
        "A food support delivery app that turns requests, meal inventory, volunteer capacity, and delivery constraints into safer routes.",
        x + 24,
        content_top - 102,
        400,
        10.3,
        "DMSans",
        P.muted,
        13,
    )
    hero_flow(c, x + 494, content_top - 104, w - 516, 70)

    section_y = content_top - 154
    col_w = (w - 28) / 2
    round_rect(c, x, section_y - 128, col_w, 128, 16, P.surface, P.line)
    round_rect(c, x + col_w + 28, section_y - 128, col_w, 128, 16, P.surface, P.line)
    circle_icon(c, "warning-alert.png", x + 16, section_y - 34, 27, P.blue_tint)
    label(c, "Problem", x + 54, section_y - 20)
    text(c, "Track chosen and problem tackled", x + 54, section_y - 42, 12.6, "Outfit", P.navy)
    paragraph(
        c,
        "We chose Track 2: Food Security Delivery Operations. We tackled the coordination problem faced by volunteer-led food delivery programs that manage food requests, meal inventory, volunteer availability, allergies, accessibility constraints, cold-chain needs, routes, and delivery status across forms, spreadsheets, messages, phone calls, and memory.\n\nMealflo reduces that burden by making requests, constraints, routes, driver assignments, and delivery progress visible in one place.",
        x + 16,
        section_y - 62,
        col_w - 32,
        8.2,
        "DMSans",
        P.ink,
        10.7,
    )
    x2 = x + col_w + 28
    circle_icon(c, "checkmark-circle.png", x2 + 16, section_y - 34, 27, P.yellow_100)
    label(c, "Working web app", x2 + 54, section_y - 20)
    text(c, "What we built", x2 + 54, section_y - 42, 12.6, "Outfit", P.navy)
    paragraph(
        c,
        "We built Mealflo, a working web app for coordinating food support delivery operations. It connects public intake, coordinator operations, and a phone-first volunteer driver experience, backed by a database layer, map-based routing, inventory awareness, and OpenAI-assisted parsing for intake and inventory workflows.",
        x2 + 16,
        section_y - 62,
        col_w - 32,
        8.5,
        "DMSans",
        P.ink,
        11.2,
    )

    lane_y = 82
    lane_h = 126
    round_rect(c, x, lane_y, w, lane_h, 16, P.surface_tint, P.line)
    lanes = [
        (
            "person-plus.png",
            "Public intake",
            "Recipients request food support and volunteers offer to deliver. Mealflo captures address, meal count, timing, dietary needs, allergies, mobility constraints, vehicle access, and cooler capacity.",
        ),
        (
            "grocery-bag.png",
            "Coordinator dashboard",
            "Coordinators review intake, approve structured drafts, check inventory, generate routes, assign drivers, and monitor progress from one operational view.",
        ),
        (
            "phone-handset.png",
            "Volunteer driver view",
            "Drivers choose availability, accept a suggested route, see each stop with delivery notes and meal details, follow the map, and mark stops complete.",
        ),
    ]
    lane_w = w / 3
    for i, (img, title, body) in enumerate(lanes):
        lx = x + i * lane_w
        if i:
            stroke(c, P.line)
            c.line(lx, lane_y + 18, lx, lane_y + lane_h - 18)
        circle_icon(c, img, lx + 18, lane_y + lane_h - 45, 30)
        text(c, title, lx + 58, lane_y + lane_h - 29, 12.5, "Outfit", P.navy)
        paragraph(c, body, lx + 18, lane_y + lane_h - 68, lane_w - 36, 8.4, "DMSans", P.ink, 10.8)
    footer(c, 1)


def draw_map(c: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    round_rect(c, x, y, w, h, 16, P.blue_tint, P.line)
    c.saveState()
    c.setStrokeColor(colors.Color(120 / 255, 144 / 255, 250 / 255, alpha=0.22))
    c.setLineWidth(4)
    c.line(x + 20, y + 28, x + 58, y + 62)
    c.line(x + 58, y + 62, x + 96, y + 49)
    c.line(x + 96, y + 49, x + 144, y + 86)
    c.line(x + 144, y + 86, x + w - 28, y + 36)
    c.setStrokeColor(colors.HexColor("#1f66b3"))
    c.setLineWidth(2.5)
    path = c.beginPath()
    path.moveTo(x + 32, y + 38)
    path.curveTo(x + 64, y + 78, x + 97, y + 58, x + 127, y + 72)
    path.curveTo(x + 150, y + 84, x + 171, y + 64, x + w - 46, y + 93)
    c.drawPath(path, stroke=1, fill=0)
    for px, py, color in [
        (x + 42, y + 49, P.warning),
        (x + 122, y + 70, P.action),
        (x + 151, y + 94, P.success),
        (x + w - 56, y + 86, P.yellow),
    ]:
        c.setFillColor(color)
        c.circle(px, py, 5.5, stroke=0, fill=1)
    c.restoreState()
    text(c, "0 active", x + 14, y + 12, 8, "DMSans", P.navy)


def workflow_step(
    c: canvas.Canvas,
    idx: int,
    title: str,
    body: str,
    x: float,
    y: float,
    w: float,
    h: float,
) -> None:
    c.setFillColor(P.yellow)
    c.circle(x + 15, y + h - 16, 12, stroke=0, fill=1)
    text(c, str(idx), x + 15, y + h - 20, 8, "DMSans", P.navy, "center")
    text(c, title, x + 36, y + h - 20, 11.8, "Outfit", P.navy)
    paragraph(c, body, x, y + h - 46, w, 8.2, "DMSans", P.ink, 10.6)


def page_two(c: canvas.Canvas) -> None:
    top_bar(c)
    x = MARGIN_X
    w = PAGE_W - 2 * MARGIN_X
    title_y = PAGE_H - 118
    label(c, "Operator workflow", x, title_y)
    text(c, "How a frontline operator would use it on a real Monday morning", x, title_y - 28, 19.6, "Outfit", P.navy)
    paragraph(
        c,
        "A frontline coordinator opening Mealflo on a busy Monday can move from scattered information to an actionable delivery plan.",
        x,
        title_y - 48,
        520,
        10.2,
        "DMSans",
        P.muted,
        13,
    )

    left_w = 510
    right_x = x + left_w + 28
    start_y = 336
    row_gap = 30
    col_gap = 28
    step_w = (left_w - col_gap) / 2
    step_h = 86
    round_rect(c, x - 10, 86, left_w + 20, 336, 18, P.surface, P.line)
    stroke(c, P.line)
    c.line(x + step_w + col_gap / 2, 108, x + step_w + col_gap / 2, 402)
    c.line(x + 20, 306, x + left_w - 20, 306)
    c.line(x + 20, 190, x + left_w - 20, 190)
    steps = [
        (
            "Review new requests",
            "Instead of searching through emails, forms, spreadsheets, and messages, the coordinator sees incoming requests with address, meal count, urgency, dietary needs, allergies, mobility needs, and delivery notes.",
        ),
        (
            "Approve structured intake",
            "Mealflo helps turn intake messages into structured drafts. The coordinator reviews the original request, checks parsed details, and approves delivery work.",
        ),
        (
            "Check meals and drivers",
            "The coordinator sees which meals are ready and which volunteers are available, including time windows, vehicle access, cooler capacity, stair comfort, and other limits.",
        ),
        (
            "Generate routes",
            "Deliveries are grouped into route suggestions based on urgency, inventory, location, driver capacity, and food requirements. The coordinator assigns a driver and confirms what to load.",
        ),
        (
            "Guide the driver",
            "The driver mobile view shows the next stop, address, meals to deliver, delivery notes, map guidance, and a simple completion action.",
        ),
        (
            "Track completion",
            "As stops are completed, the dashboard updates so the coordinator can see what is out for delivery, complete, delayed, or needing follow-up without calling every driver.",
        ),
    ]
    for idx, (title, body) in enumerate(steps, 1):
        row = (idx - 1) // 2
        col = (idx - 1) % 2
        sx = x + col * (step_w + col_gap)
        sy = start_y - row * (step_h + row_gap)
        workflow_step(c, idx, title, body, sx, sy, step_w, step_h)

    round_rect(c, right_x, 292, w - left_w - 28, 130, 18, P.surface, P.line)
    label(c, "Live map", right_x + 18, 396)
    text(c, "Delivery coordination snapshot", right_x + 18, 374, 13.2, "Outfit", P.navy)
    draw_map(c, right_x + 18, 302, w - left_w - 64, 62)

    table_y = 110
    table_h = 154
    round_rect(c, right_x, table_y, w - left_w - 28, table_h, 18, P.surface_tint, P.line)
    label(c, "Ready today", right_x + 18, table_y + table_h - 34)
    text(c, "Coordinator view", right_x + 18, table_y + table_h - 55, 12.6, "Outfit", P.navy)
    rows = [("Mabel Hart", "9", "2"), ("Keisha Noor", "9", "2"), ("Noel Okafor", "9", "3"), ("Priya Sandhu", "9", "3")]
    tx, ty = right_x + 18, table_y + table_h - 77
    text(c, "Client", tx, ty, 7.4, "DMSans", P.muted)
    text(c, "Urgency", tx + 112, ty, 7.4, "DMSans", P.muted, "center")
    text(c, "Meals", tx + 156, ty, 7.4, "DMSans", P.muted, "center")
    ty -= 16
    for name, urg, meals in rows:
        stroke(c, P.line)
        c.line(tx, ty + 10, right_x + w - left_w - 48, ty + 10)
        text(c, name, tx, ty, 7.7, "DMSans", P.ink)
        text(c, urg, tx + 112, ty, 7.7, "DMSans", P.navy, "center")
        text(c, meals, tx + 156, ty, 7.7, "DMSans", P.navy, "center")
        ty -= 17
    text(c, "View all", right_x + w - left_w - 52, table_y + 15, 7.5, "DMSans", P.action, "right")

    round_rect(c, x, 50, w, 44, 16, P.yellow_100, P.yellow)
    circle_icon(c, "route-road.png", x + 14, 58, 28, P.yellow)
    text(c, "Intended result", x + 58, 70, 12, "Outfit", P.navy)
    paragraph(
        c,
        "Mealflo gives frontline coordinators a calmer operating rhythm: requests, constraints, meal availability, routes, driver updates, and follow-up actions are visible in one place.",
        x + 188,
        72,
        w - 220,
        8.7,
        "DMSans",
        P.ink,
        11,
    )
    footer(c, 2)


def page_three(c: canvas.Canvas) -> None:
    top_bar(c)
    x = MARGIN_X
    w = PAGE_W - 2 * MARGIN_X
    hero_y = PAGE_H - 236
    round_rect(c, x, hero_y, w, 104, 18, P.surface, P.line)
    c.setFillColor(P.yellow)
    c.roundRect(x, hero_y, 8, 104, 4, stroke=0, fill=1)
    label(c, "Next release", x + 22, hero_y + 70)
    text(c, "What we would ship next with one more week", x + 22, hero_y + 38, 19.4, "Outfit", P.navy)
    paragraph(
        c,
        "With one more week, we would focus on making Mealflo easier to use in real community operations.",
        x + 22,
        hero_y + 18,
        560,
        10.1,
        "DMSans",
        P.muted,
        13,
    )

    release_y = 170
    release_h = 176
    round_rect(c, x, release_y, w, release_h, 18, P.surface, P.line)
    releases = [
        (
            "01",
            "person-plus.png",
            "Additional intake channels",
            "Food support requests often come through Instagram, Facebook, text messages, voicemail, email, or direct messages rather than a formal web form. We would add more intake channels so teams can capture requests from the places people already use.",
        ),
        (
            "02",
            "phone-handset.png",
            "Real SMS communication",
            "Drivers need simple, reliable communication during deliveries. We would add real text messaging from the driver flow, including pre-written messages like: \"Hi, this is your meal delivery driver. I'm outside now.\"",
        ),
        (
            "03",
            "chat-bubble.png",
            "Field testing with a real organization",
            "We would work with a real food support organization to test Mealflo against actual intake patterns, route constraints, volunteer workflows, and communication needs, so the next version is shaped by frontline reality instead of demo assumptions.",
        ),
    ]
    col_w = w / 3
    for idx, (num, img, title, body) in enumerate(releases):
        cx = x + idx * col_w
        if idx:
            stroke(c, P.line)
            c.line(cx, release_y + 18, cx, release_y + release_h - 18)
        round_rect(c, cx + 18, release_y + release_h - 44, 42, 26, 13, P.navy)
        text(c, num, cx + 39, release_y + release_h - 35, 9.4, "DMSans", P.surface, "center")
        circle_icon(c, img, cx + col_w - 54, release_y + release_h - 44, 30, P.yellow_100 if idx != 2 else P.blue_tint)
        title_y = release_y + release_h - 78
        paragraph(c, title, cx + 18, title_y, col_w - 52, 12.2, "Outfit", P.navy, 13.0, max_lines=2)
        paragraph(c, body, cx + 18, release_y + release_h - 112, col_w - 44, 8.4, "DMSans", P.ink, 10.6)

    band_y = 78
    round_rect(c, x, band_y, w, 72, 18, P.blue_tint, P.line)
    label(c, "Mealflo in one line", x + 22, band_y + 48)
    paragraph(
        c,
        "Mealflo turns food support requests, meal inventory, volunteer capacity, and delivery constraints into safer routes and a clearer delivery workflow.",
        x + 22,
        band_y + 26,
        500,
        12.3,
        "Outfit",
        P.navy,
        14.4,
    )
    flow_x = x + w - 204
    for i, item in enumerate(["Requests", "Routes", "Delivery"]):
        round_rect(c, flow_x + i * 68, band_y + 26, 58, 22, 10, P.surface, P.line)
        text(c, item, flow_x + i * 68 + 29, band_y + 33, 7.7, "DMSans", P.navy, "center")
        if i < 2:
            stroke(c, P.line_strong)
            c.line(flow_x + i * 68 + 58, band_y + 37, flow_x + i * 68 + 68, band_y + 37)
    footer(c, 3)


def build() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    register_fonts()
    c = canvas.Canvas(str(OUT), pagesize=landscape(letter), pageCompression=1)
    c.setTitle("Mealflo Hackathon Writeup")
    c.setAuthor("Mealflo")
    for page_func in [page_one, page_two, page_three]:
        page_func(c)
        c.showPage()
    c.save()


if __name__ == "__main__":
    build()
