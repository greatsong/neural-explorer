#!/usr/bin/env python3
"""특강 활동지 HTML → 편집 가능한 HWPX 변환기.

경로: 활동지 HTML → (K-Teacher 방언 HTML + SVG를 PNG로 렌더) → hwpx-skill의
html2hwpx.py → 그림 문단 삽입 → 검증.

hwpx-skill(vendor)은 수정하지 않는다. 이 스크립트만 프로젝트 소유다.
그림은 html2hwpx가 다루지 않으므로, 본문에 표시자 문단을 넣어 두고
변환 후 section0.xml에서 그 문단을 hp:pic 문단으로 바꾼다.

사용:
    python3 scripts/worksheet_to_hwpx.py print/special-ms2-student.html \\
        print/special-ms2-student.hwpx
"""

from __future__ import annotations

import argparse
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from lxml import etree
from lxml import html as LH

SKILL_DIR = Path.home() / "greatsong-project/tonggwa/vendor/hwpx-skill"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

MM = 283.465  # 1mm 당 HWPUNIT
TEXT_WIDTH_MM = 165.0  # A4 본문 폭 기준
GRID_GAP_MM = 6.0  # 나란히 놓는 두 그림 사이 간격

# 빈칸 span을 밑줄 문자로. 한글 문서에서 손으로 쓸 폭을 고려한 길이.
BLANK_LEN = {"": 9, "lg": 16, "xl": 28}


def classes(el) -> set:
    return set((el.get("class") or "").split())


def text_of(el, skip_classes=()) -> str:
    """요소의 표시 텍스트. span.bk는 밑줄 빈칸으로, br은 줄바꿈으로 바꾼다."""
    parts: list[str] = []

    def walk(node):
        cls = classes(node)
        tag = node.tag if isinstance(node.tag, str) else ""
        if tag == "br":
            parts.append("\n")
        elif "bk" in cls:
            kind = "xl" if "xl" in cls else ("lg" if "lg" in cls else "")
            parts.append("_" * BLANK_LEN[kind])
        elif cls & set(skip_classes):
            pass
        else:
            if node.text:
                parts.append(node.text)
            for child in node:
                walk(child)
        if node.tail:
            parts.append(node.tail)

    if el.text:
        parts.append(el.text)
    for child in el:
        walk(child)
    raw = "".join(parts)
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in raw.split("\n")]
    return "\n".join(ln for ln in lines if ln)


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    )


# --------------------------------------------------------------------------
# SVG → PNG
# --------------------------------------------------------------------------
def render_svgs(svgs, workdir: Path) -> list[dict]:
    """각 SVG를 헤드리스 크롬으로 PNG 렌더. 한글 글꼴을 그대로 쓴다."""
    out = []
    for idx, svg in enumerate(svgs):
        vb = svg.get("viewBox") or svg.get("viewbox")
        x0, y0, vw, vh = (float(v) for v in vb.split())
        raw = etree.tostring(svg, encoding="unicode")
        page = workdir / f"svg{idx}.html"
        page.write_text(
            "<!doctype html><meta charset='utf-8'>"
            "<style>html,body{margin:0;padding:0;background:#fff}"
            f"svg{{display:block;width:{vw:.0f}px;height:{vh:.0f}px}}</style>{raw}",
            encoding="utf-8",
        )
        png = workdir / f"image{idx + 1}.png"
        subprocess.run(
            [
                CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
                "--hide-scrollbars", "--force-device-scale-factor=3",
                "--default-background-color=ffffff",
                f"--screenshot={png}", f"--window-size={vw:.0f},{vh:.0f}",
                f"file://{page}",
            ],
            check=True, capture_output=True,
        )
        if not png.is_file():
            raise RuntimeError(f"PNG 렌더 실패: {png}")
        out.append({"id": f"image{idx + 1}", "file": png.name, "src_path": str(png),
                    "ratio": vh / vw})
    return out


def grid_pair(grid):
    """두 칸 grid 안의 그림 두 개(svg). 그림이 정확히 둘일 때만 돌려준다."""
    sfs = [c for c in grid.iter() if isinstance(c.tag, str) and "sf" in classes(c)]
    svgs = [s.xpath('.//*[local-name()="svg"]') for s in sfs]
    if len(sfs) == 2 and all(svgs):
        return [found[0] for found in svgs]
    return None


def render_pair(pair, widths_mm, idx: int, workdir: Path) -> dict:
    """나란히 놓을 두 그림을 한 장으로 렌더한다.

    한 문단에 그림 둘을 글자처럼 넣으면 줄 높이를 잘못 계산해 본문과 겹치는 뷰어가 있다.
    """
    total = sum(widths_mm) + GRID_GAP_MM
    page_w = 1000  # 합친 그림의 CSS 폭(px)
    parts, heights = [], []
    for svg, w in zip(pair, widths_mm):
        _, _, vw, vh = (float(v) for v in (svg.get("viewBox") or svg.get("viewbox")).split())
        px = page_w * w / total
        heights.append(px * vh / vw)
        raw = etree.tostring(svg, encoding="unicode")
        parts.append(f"<div style='width:{px:.1f}px;height:{px * vh / vw:.1f}px'>{raw}</div>")
    page_h = max(heights)
    page = workdir / f"pair{idx}.html"
    page.write_text(
        "<!doctype html><meta charset='utf-8'>"
        "<style>html,body{margin:0;padding:0;background:#fff}"
        "svg{display:block;width:100%;height:100%}</style>"
        f"<div style='display:flex;justify-content:space-between;align-items:flex-start;"
        f"width:{page_w}px'>{''.join(parts)}</div>",
        encoding="utf-8",
    )
    png = workdir / f"image{idx + 1}.png"
    subprocess.run(
        [
            CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
            "--hide-scrollbars", "--force-device-scale-factor=3",
            "--default-background-color=ffffff",
            f"--screenshot={png}", f"--window-size={page_w},{math.ceil(page_h)}",
            f"file://{page}",
        ],
        check=True, capture_output=True,
    )
    if not png.is_file():
        raise RuntimeError(f"PNG 렌더 실패: {png}")
    return {"id": f"image{idx + 1}", "file": png.name, "src_path": str(png),
            "ratio": math.ceil(page_h) / page_w}


# --------------------------------------------------------------------------
# 활동지 HTML → K-Teacher 방언 HTML
# --------------------------------------------------------------------------
class Builder:
    # 교사용 문서에서 라벨 span이 없을 때 쓸 기본 이름
    DEFAULT_LABEL = {"ans": "정답", "tt": "수업 팁", "pf": "자주 틀림", "sc": "멘트"}

    def __init__(self, figures):
        self.figures = figures
        self.in_group = False  # 문항 묶음 표시자를 연 상태인지
        self.fig_at = {}   # svg 요소 → 그림 인덱스
        self.pair_at = {}  # 두 그림을 나란히 놓는 grid 요소 → (합친 그림 인덱스, 폭 mm)
        self.buf: list[str] = []
        self.step = 0

    def p(self, text, block_type=None, step=None):
        for line in text.split("\n"):
            if not line.strip():
                continue
            attrs = ""
            if block_type:
                attrs += f' data-block-type="{block_type}"'
            if step:
                attrs += f' data-step="{esc(step)}"'
            self.buf.append(f"<p{attrs}>{esc(line)}</p>")

    def figure(self, svg, width_mm):
        idx = self.fig_at[svg]
        self.buf.append(f"<p>[[IMG:{idx}:{width_mm:.0f}]]</p>")

    def caption(self, text):
        if text:
            self.buf.append(f'<div class="caption">{esc(text)}</div>')

    def box(self, label, body):
        """라벨 머리행 + 본문 행의 1열 표.

        html2hwpx의 둥근 글상자는 높이가 고정이거나 어림값이라 긴 안내문이
        잘린다. 표는 한글이 내용에 맞게 행 높이를 늘리므로 잘리지 않는다.
        """
        lines = [ln for ln in body.split("\n") if ln.strip()]
        if not lines and not label:
            return
        self.buf.append("<table>")
        if label:
            self.buf.append(f"<tr><th>{esc(label)}</th></tr>")
        for line in lines:
            self.buf.append(f"<tr><td>{esc(line)}</td></tr>")
        self.buf.append("</table>")

    def table(self, tbl):
        rows = []
        for tr in tbl.xpath(".//tr"):
            cells = tr.xpath("./th | ./td")
            if not cells:
                continue
            texts, is_header, has_blank = [], False, False
            for cell in cells:
                span = int(cell.get("colspan") or 1)
                value = text_of(cell).replace("\n", " ")
                texts.append(value)
                texts.extend([""] * (span - 1))
                if cell.tag == "th":
                    is_header = True
                if "blank" in classes(cell) and not value:
                    has_blank = True
            rows.append({"cells": texts, "header": is_header, "blank": has_blank})
        if not rows:
            return
        width = max(len(r["cells"]) for r in rows)
        # 빈칸 행 높이. 한 쪽에 모아야 하는 표는 HTML에 data-hwpx-row-mm로 낮춘다(세션 3)
        row_mm = tbl.get("data-hwpx-row-mm") or "13"
        self.buf.append('<table data-block-type="fill_table">')
        for row in rows:
            cells = row["cells"] + [""] * (width - len(row["cells"]))
            height = f' data-row-height-mm="{row_mm}"' if row["blank"] else ""
            tag = "th" if row["header"] else "td"
            body = "".join(f"<{tag}>{esc(c)}</{tag}>" for c in cells)
            self.buf.append(f"<tr{height}>{body}</tr>")
        self.buf.append("</table>")

    def answer_box(self, el):
        lines = 3 if "lg" in classes(el) else 2
        style = el.get("style") or ""
        if "90pt" in style:
            lines = 4
        self.buf.append('<table data-block-type="answer_box">')
        for _ in range(lines):
            self.buf.append('<tr data-row-height-mm="9"><td></td></tr>')
        self.buf.append("</table>")

    # -- 요소별 처리 ------------------------------------------------------
    def walk(self, el):
        tag = el.tag if isinstance(el.tag, str) else ""
        cls = classes(el)

        if tag == "h2":
            title = text_of(el, skip_classes=("tm", "ss"))
            sub_el = el.xpath('.//span[@class="tm"] | .//span[@class="ss"]')
            time = text_of(sub_el[0]) if sub_el else ""
            self.buf.append('<p data-block-type="page_break">[page-break]</p>'
                            if self.section_count else "")
            self.section_count += 1
            self.buf.append(f'<section class="block"><h2>{esc(title)}</h2></section>')
            if time:
                self.buf.append(f'<div class="caption">{esc(time)}</div>')
            return

        if cls & {"ib"}:
            title = el.xpath('./div[@class="t"]')
            head = text_of(title[0]) if title else ""
            formulas = el.xpath('./div[contains(@class,"fm")]')
            body = text_of(el, skip_classes=("t", "fm"))
            self.box(head, body)
            for fm in formulas:
                self.p(text_of(fm))
            return

        if cls & {"sf"}:
            # 바로 뒤 문항이 쓰는 그림(2-1, 4A-1 등)은 그 문항과 같은 묶음에 넣는다.
            # 설명이 달린 그림은 개념 그림일 수 있어, 뒤 문항이 '그림'을 말할 때만 묶는다(1-1 앞 인공 뉴런 그림은 묶지 않음)
            nxt = self._next_card(el)
            has_cap = bool(el.xpath('.//div[@class="cap"]'))
            if nxt is not None and not self.in_group and (not has_cap or "그림" in text_of(nxt)):
                self.buf.append(f"<p>{KEEP_START}</p>")
                self.in_group = True
            svg = el.xpath('.//*[local-name()="svg"]')
            if svg:
                self.figure(svg[0], self.fig_width(svg[0]))
            cap = el.xpath('.//div[@class="cap"]')
            if cap:
                self.caption(text_of(cap[0]))
            return

        if cls & {"qc", "opt"}:
            # 문항 하나를 인쇄할 때 쪽 경계에서 나뉘지 않게 묶는다(keep_questions_together가 처리)
            if not self.in_group:
                self.buf.append(f"<p>{KEEP_START}</p>")
            self.in_group = True
            for child in el:
                self.walk_card(child)
            self.buf.append(f"<p>{KEEP_END}</p>")
            self.in_group = False
            return

        if cls & {"grid"}:
            sfs = [c for c in el.iter() if isinstance(c.tag, str) and "sf" in classes(c)]
            if el in self.pair_at:
                # 활동지처럼 두 그림을 나란히 놓는다(한 장으로 합친 그림). 위아래로 쌓으면 문항 하나가 한 쪽을 넘는다
                if self._next_is_card(el) and not self.in_group:
                    self.buf.append(f"<p>{KEEP_START}</p>")
                    self.in_group = True
                idx, width_mm = self.pair_at[el]
                self.buf.append(f"<p>[[IMG:{idx}:{width_mm:.0f}]]</p>")
                for sf in sfs:
                    cap = sf.xpath('.//div[@class="cap"]')
                    if cap:
                        self.caption(text_of(cap[0]))
                return
            for child in sfs:
                self.walk(child)
            return

        # -- 교재의 요소 -------------------------------------------------
        if cls & {"fm"}:
            self.p(text_of(el))
            return

        if cls & {"ws"}:
            lab = el.xpath('./span[@class="lab"]')
            self.box(text_of(lab[0]) if lab else "활동지", text_of(el, skip_classes=("lab",)))
            return

        if cls & {"deep"}:
            head = el.xpath('./div[@class="t"]')
            title = text_of(head[0]).replace("\n", " ") if head else "더 알고 싶은 사람"
            lines = [text_of(p_).replace("\n", " ") for p_ in el.xpath("./p")]
            self.box(title, "\n".join(x for x in lines if x))
            return

        if cls & {"tl"}:
            self.buf.append("<table>")
            self.buf.append("<tr><th>연도</th><th>내용</th></tr>")
            for item in el.xpath("./div"):
                year = item.xpath("./b")
                y = text_of(year[0]) if year else ""
                rest = text_of(item, skip_classes=()).replace("\n", " ")
                if y and rest.startswith(y):
                    rest = rest[len(y):].strip()
                self.buf.append(f"<tr><td>{esc(y)}</td><td>{esc(rest)}</td></tr>")
            self.buf.append("</table>")
            return

        # -- 교사용 문서의 요소 -------------------------------------------
        if cls & {"ans", "tt", "pf", "sc"}:
            lab = el.xpath('./span[@class="lab"]')
            head = text_of(lab[0]) if lab else self.DEFAULT_LABEL[
                next(iter(cls & {"ans", "tt", "pf", "sc"}))]
            self.box(head, text_of(el, skip_classes=("lab",)))
            return

        if cls & {"qh"}:
            num = el.xpath('./span[@class="num"]')
            label = text_of(num[0]) if num else ""
            title = text_of(el, skip_classes=("num",))
            self.buf.append(f"<h3>{esc((label + '  ' + title).strip())}</h3>")
            return

        if cls & {"url"}:
            self.p(text_of(el))
            return

        if tag == "h3":
            text = text_of(el)
            if text:
                self.buf.append(f"<h3>{esc(text)}</h3>")
            return

        if tag == "table":
            self.table(el)
            return

        if tag in {"ul", "ol"}:
            items = [text_of(li).replace("\n", " ") for li in el.xpath("./li")]
            items = [i for i in items if i]
            if items:
                tag_name = "ol" if tag == "ol" else "ul"
                self.buf.append(f"<{tag_name}>")
                for item in items:
                    self.buf.append(f"<li>{esc(item)}</li>")
                self.buf.append(f"</{tag_name}>")
            return

        if tag == "p":
            self.p(text_of(el))
            return

        for child in el:
            if isinstance(child.tag, str):
                self.walk(child)

    @staticmethod
    def _next_card(el):
        nxt = el.getnext()
        while nxt is not None and not isinstance(nxt.tag, str):  # 주석 건너뛰기
            nxt = nxt.getnext()
        return nxt if nxt is not None and classes(nxt) & {"qc", "opt"} else None

    @classmethod
    def _next_is_card(cls, el) -> bool:
        return cls._next_card(el) is not None

    def walk_card(self, el):
        tag = el.tag if isinstance(el.tag, str) else ""
        cls = classes(el)

        if cls & {"qh"}:
            num = el.xpath('./span[@class="num"]')
            label = text_of(num[0]) if num else ""
            title = text_of(el, skip_classes=("num",))
            self.step = label
            self.buf.append(f"<h3>{esc((label + '  ' + title).strip())}</h3>")
            return
        if cls & {"how"}:
            bold = el.xpath("./b[1]")
            label = text_of(bold[0]) if bold else "이렇게 하세요"
            body = text_of(el, skip_classes=())
            if bold and body.startswith(label):
                body = body[len(label):].strip()
            self.box(label, body)
            return
        if cls & {"qd"}:
            self.p(text_of(el), None)
            return
        if cls & {"fm"}:
            self.p(text_of(el))
            return
        if cls & {"ob"}:
            lab = el.xpath('./div[@class="lab"]')
            head = text_of(lab[0]) if lab else "정리"
            body = text_of(el, skip_classes=("lab",))
            self.box(head, body)
            return
        if cls & {"ans-area"}:
            self.answer_box(el)
            return
        if tag == "table":
            self.table(el)
            return
        if cls & {"sf", "grid", "ib"}:
            self.walk(el)
            return
        if tag in {"div", "p"}:
            text = text_of(el)
            if text:
                self.p(text)
            return

    def fig_width(self, svg):
        vb = svg.get("viewBox") or svg.get("viewbox")
        vw = float(vb.split()[2])
        # 모눈처럼 좁은 그림은 손으로 점을 찍을 수 있게 78mm.
        # 나머지는 활동지 HTML을 인쇄할 때와 같은 크기(svg width px → mm). 본문 폭에 가깝게 키우면 쪽수가 늘어난다
        if vw < 260:
            return 78.0
        width_px = svg.get("width")
        return min(TEXT_WIDTH_MM, float(width_px) * 25.4 / 96 if width_px else vw * 0.36)

    def build(self, body) -> str:
        self.section_count = 0
        header = body.xpath('./header[contains(@class,"lh")]')[0]

        def first(xpath, default=""):
            found = header.xpath(xpath)
            return text_of(found[0]) if found else default

        title = first("./h1", "활동지")
        eyebrow = first('.//*[@class="lab"]', "NEURAL EXPLORER")
        sub = first('.//*[@class="sub"]')
        obj = first('.//*[@class="obj"]')
        has_name = bool(header.xpath('.//*[@class="name"]'))

        self.buf.append('<section class="page">')
        self.buf.append('<header class="doc-header">')
        self.buf.append(f'<div class="eyebrow">{esc(eyebrow)}</div>')
        self.buf.append(f"<h1>{esc(title)}</h1>")
        self.buf.append(f'<div class="subtitle">{esc(sub)}</div>')
        head_text = text_of(header)
        if "교재" in eyebrow:
            badge, tagline = "TEXTBOOK", "읽기 자료"
        elif "교사" in head_text or "스크립트" in eyebrow:
            badge, tagline = "TEACHER", "교사용"
        else:
            badge, tagline = "WORKSHEET", "손으로 계산하기"
        self.buf.append(f'<div class="header-badge"><strong>{badge}</strong>'
                        f"<span>{tagline}</span></div>")
        self.buf.append("</header>")
        if has_name:
            self.buf.append('<div class="identity">'
                            "<div><b>SCHOOL</b>학교</div><div><b>GRADE</b>학년</div>"
                            "<div><b>CLASS</b>반</div><div><b>NAME</b>이름</div>"
                            "<div><b>DATE</b>날짜</div></div>")
        if obj:
            lines = obj.split("\n")
            if "학습 목표" in lines:
                k = lines.index("학습 목표")
                before, after = lines[:k], lines[k + 1:]
                if before:
                    self.box("이 자료를 읽는 법", "\n".join(before))
                self.box("학습 목표", "\n".join(after))
            else:
                self.box("오늘의 목표", obj)

        for el in body:
            if not isinstance(el.tag, str):
                continue
            if el is header:
                continue
            self.walk(el)

        self.buf.append("</section>")
        body_html = "\n".join(x for x in self.buf if x)
        return (
            "<!doctype html>\n<html lang='ko'><head><meta charset='utf-8'>"
            f"<title>{esc(title)}</title></head>\n"
            f"<body data-document-class='worksheet'>\n{body_html}\n</body></html>\n"
        )


# --------------------------------------------------------------------------
# 그림 문단 삽입
# --------------------------------------------------------------------------
def insert_figures(hwpx: Path, figures: list[dict], placements: dict):
    """표시자 문단을 hp:pic 문단으로 교체하고 BinData·content.hpf에 등록."""
    sys.path.insert(0, str(SKILL_DIR / "scripts"))
    import hwpx_helpers as H  # noqa: E402

    H.reset_id(7700000)  # 기존 ID와 겹치지 않는 대역

    import zipfile

    used = []
    with zipfile.ZipFile(hwpx, "r") as zf:
        section = zf.read("Contents/section0.xml").decode("utf-8")

    def image_para(idx, width_mm):
        # 한글이 만드는 파일처럼 넣는 순서대로 image1부터 번호를 붙인다.
        # 번호가 0부터이거나 건너뛰면 번호를 읽는 뷰어에서 그림이 엉뚱한 자리에 들어간다
        fig = dict(figures[idx])
        fig["id"] = f"image{len(used) + 1}"
        fig["file"] = f"{fig['id']}.png"
        used.append(fig)
        width = int(width_mm * MM)
        height = int(width * fig["ratio"])
        return H.make_image_para(fig["id"], width=width, height=height, parapr="20")  # 20 = 가운데 정렬

    for marker, items in placements:
        pattern = re.compile(
            r"<hp:p\b[^>]*>(?:(?!</hp:p>).)*?" + re.escape(marker)
            + r"(?:(?!</hp:p>).)*?</hp:p>", re.S)
        if not pattern.search(section):
            raise RuntimeError(f"표시자를 찾지 못했습니다: {marker}")
        para = image_para(*items)
        section = pattern.sub(lambda _m: para, section, count=1)

    tmp = str(hwpx) + ".sec"
    with zipfile.ZipFile(hwpx, "r") as zin, \
            zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "Contents/section0.xml":
                data = section.encode("utf-8")
            if item.filename == "mimetype":
                zout.writestr(item, data, compress_type=zipfile.ZIP_STORED)
            else:
                zout.writestr(item, data)
    Path(tmp).replace(hwpx)

    H.add_images_to_hwpx(str(hwpx), used)
    H.update_content_hpf(str(hwpx), used)


KEEP_START = "[[KEEP-START]]"
KEEP_END = "[[KEEP-END]]"


def keep_questions_together(hwpx) -> tuple[int, int]:
    """문항 묶음 표시자 사이의 문단을 인쇄할 때 한 쪽에 모이게 한다.

    - 묶음 안의 마지막 문단을 뺀 모든 최상위 문단에 '다음 문단과 함께'(keepWithNext)를 켠다.
      표·그림은 글자처럼 취급(treatAsChar=1)되어 문단 안에 있으므로 함께 묶인다.
    - 묶음 안의 표는 '쪽 경계에서 나누지 않음'(pageBreak="NONE", 한글이 쓰는 값)으로 바꾼다.
    - 마지막 문단은 그대로 두어 문항과 문항 사이에서는 쪽이 넘어갈 수 있게 한다.
    - 표시자 문단은 지운다.
    - html2hwpx가 본문에 개요 문단 모양을 써서 한글이 번호(가., 나., 쪽 나눔 문단의 ①)를
      자동으로 붙인다. 활동지는 번호를 글자로 적으므로 모든 문단에서 자동 번호를 뺀다.
    """
    import copy
    import zipfile
    from lxml import etree as ET

    with zipfile.ZipFile(hwpx, "r") as zf:
        sec_raw = zf.read("Contents/section0.xml")
        head_raw = zf.read("Contents/header.xml")

    def decl(raw: bytes) -> bytes:
        m = re.match(rb"<\?xml[^>]*\?>", raw)
        return m.group(0) if m else b'<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>'

    sec = ET.fromstring(sec_raw)
    head = ET.fromstring(head_raw)
    HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"
    HH = "http://www.hancom.co.kr/hwpml/2011/head"

    def text(p):
        return "".join(t.text or "" for t in p.iter(f"{{{HP}}}t"))

    groups, current = [], None
    markers = []
    for p in list(sec):
        if p.tag != f"{{{HP}}}p":
            continue
        t = text(p).strip()
        if t == KEEP_START:
            current = []
            markers.append(p)
        elif t == KEEP_END:
            if current:
                groups.append(current)
            current = None
            markers.append(p)
        elif current is not None:
            current.append(p)

    props = head.find(f".//{{{HH}}}paraProperties")
    by_id = {pp.get("id"): pp for pp in props.findall(f"{{{HH}}}paraPr")}
    next_id = max(int(i) for i in by_id) + 1
    # 변환 틀의 첫 문단(구역 설정)이 정의에 없는 문단 모양(40)을 가리킨다. 기본 모양으로 바꾼다
    for p in sec.iter(f"{{{HP}}}p"):
        if p.get("paraPrIDRef") not in by_id:
            p.set("paraPrIDRef", "0")
    variants = {}  # (원래 paraPr id, 묶음 여부) → 복제본 id

    def numbered(pp):
        h = pp.find(f"{{{HH}}}heading")
        return h is not None and h.get("type") != "NONE"

    def variant(pid, keep):
        """번호를 뺀(묶음이면 keepWithNext도 켠) 문단 모양. 원래 모양은 개요 스타일이 쓰므로 복제한다."""
        nonlocal next_id
        if not keep and not numbered(by_id[pid]):
            return pid
        if (pid, keep) not in variants:
            clone = copy.deepcopy(by_id[pid])
            clone.set("id", str(next_id))
            h = clone.find(f"{{{HH}}}heading")
            if h is not None:
                h.set("type", "NONE")
                h.set("idRef", "0")
                h.set("level", "0")
            if keep:
                clone.find(f"{{{HH}}}breakSetting").set("keepWithNext", "1")
            props.append(clone)
            variants[(pid, keep)] = str(next_id)
            next_id += 1
        return variants[(pid, keep)]

    for m in markers:
        sec.remove(m)
    # 세션 앞의 빈 쪽 나눔 문단을 지우고 쪽 나눔을 다음 문단(세션 제목)에 건다. 세션 첫 쪽마다 한 줄이 빈다
    for p in list(sec):
        if (p.tag == f"{{{HP}}}p" and p.get("pageBreak") == "1" and not text(p).strip()
                and not list(p.iter(f"{{{HP}}}tbl", f"{{{HP}}}pic"))
                and p.getnext() is not None and p.getnext().tag == f"{{{HP}}}p"):
            p.getnext().set("pageBreak", "1")
            sec.remove(p)
    keep_paras = {id(p) for group in groups for p in group[:-1]}
    unnumbered = 0
    for p in sec.iter(f"{{{HP}}}p"):
        pid = p.get("paraPrIDRef", "0")
        unnumbered += numbered(by_id[pid])
        p.set("paraPrIDRef", variant(pid, id(p) in keep_paras))
    for group in groups:
        for p in group:
            for tbl in p.iter(f"{{{HP}}}tbl"):
                tbl.set("pageBreak", "NONE")
    props.set("itemCnt", str(len(props.findall(f"{{{HH}}}paraPr"))))

    new_sec = decl(sec_raw) + ET.tostring(sec, encoding="UTF-8")
    new_head = decl(head_raw) + ET.tostring(head, encoding="UTF-8")
    tmp = str(hwpx) + ".keep"
    with zipfile.ZipFile(hwpx, "r") as zin, \
            zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "Contents/section0.xml":
                data = new_sec
            elif item.filename == "Contents/header.xml":
                data = new_head
            if item.filename == "mimetype":
                zout.writestr(item, data, compress_type=zipfile.ZIP_STORED)
            else:
                zout.writestr(item, data)
    Path(tmp).replace(hwpx)
    return len(groups), unnumbered


NBSP_MARK = "\ue000"


def fix_line_breaks(hwpx):
    """한글 줄 나눔을 어절 단위로 맞추고, 묶음 빈칸(임시 문자)을 hp:nbSpace로 바꾼다."""
    import zipfile

    tmp = str(hwpx) + ".lb"
    with zipfile.ZipFile(hwpx, "r") as zin, \
            zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "Contents/header.xml":
                data = data.replace(b'breakNonLatinWord="BREAK_WORD"',
                                    b'breakNonLatinWord="KEEP_WORD"')
            if item.filename.startswith("Contents/section") and item.filename.endswith(".xml"):
                data = data.decode("utf-8").replace(NBSP_MARK, "<hp:nbSpace/>").encode("utf-8")
            if item.filename == "mimetype":
                zout.writestr(item, data, compress_type=zipfile.ZIP_STORED)
            else:
                zout.writestr(item, data)
    Path(tmp).replace(hwpx)


def main():
    ap = argparse.ArgumentParser(description="활동지 HTML을 HWPX로 변환")
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--keep", help="중간 산출물을 남길 폴더")
    args = ap.parse_args()

    src = Path(args.input).resolve()
    out = Path(args.output).resolve()
    work = Path(args.keep).resolve() if args.keep else Path(tempfile.mkdtemp())
    work.mkdir(parents=True, exist_ok=True)

    doc = LH.parse(str(src))
    body = doc.find("body")
    svgs = doc.xpath('//*[local-name()="svg"]')
    figures = render_svgs(svgs, work)
    print(f"그림 {len(figures)}개 렌더 완료")

    builder = Builder(figures)
    builder.fig_at = {svg: i for i, svg in enumerate(svgs)}
    for grid in doc.xpath('//div[contains(concat(" ", @class, " "), " grid ")]'):
        pair = grid_pair(grid)
        if pair:
            half = (TEXT_WIDTH_MM - GRID_GAP_MM) / 2
            widths = [min(builder.fig_width(svg), half) for svg in pair]
            fig = render_pair(pair, widths, len(figures), work)
            builder.pair_at[grid] = (len(figures), sum(widths) + GRID_GAP_MM)
            figures.append(fig)
    kt_html = builder.build(body)
    # html2hwpx가 \s로 공백을 합치므로 묶음 빈칸을 임시 문자로 보존한다
    kt_html = kt_html.replace("\u00a0", NBSP_MARK)
    kt_path = work / "kteacher.html"
    kt_path.write_text(kt_html, encoding="utf-8")

    placements = [(m.group(0), (int(m.group(1)), int(m.group(2))))
                  for m in re.finditer(r"\[\[IMG:(\d+):(\d+)\]\]", kt_html)]
    print(f"본문 그림 {len(placements)}개 배치(나란히 놓은 쌍 {len(builder.pair_at)}개 포함)")

    subprocess.run(
        [sys.executable, str(SKILL_DIR / "scripts" / "html2hwpx.py"),
         str(kt_path), str(out), "--creator", "송석리"],
        check=True, capture_output=True,
    )
    insert_figures(out, figures, placements)
    fix_line_breaks(out)
    groups, unnumbered = keep_questions_together(out)
    print(f"문항 묶음 {groups}개: 쪽 경계에서 나뉘지 않게 설정")
    print(f"자동 문단 번호 {unnumbered}곳 제거")

    result = subprocess.run(
        [sys.executable, str(SKILL_DIR / "scripts" / "validate.py"), str(out)],
        capture_output=True, text=True)
    print(result.stdout.strip() or result.stderr.strip())
    if result.returncode != 0:
        sys.exit(1)
    print(f"완료: {out}  ({out.stat().st_size:,} bytes)")
    if not args.keep:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
