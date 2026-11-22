"""Render the report draft as print-ready HTML without extra dependencies."""

import re
from html import escape
from pathlib import Path


def format_inline(text: str) -> str:
    """Convert basic inline markdown (**bold**, `code`) to clean HTML."""
    escaped = escape(text)
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", escaped)
    return escaped


def parse_alignments(separator_line: str) -> list[str]:
    """Read markdown table column alignment markers."""
    cells = [cell.strip() for cell in separator_line.strip("|").split("|")]
    alignments: list[str] = []
    for cell in cells:
        if cell.startswith(":") and cell.endswith(":"):
            alignments.append("center")
        elif cell.endswith(":"):
            alignments.append("right")
        else:
            alignments.append("left")
    return alignments


def main() -> None:
    lines = Path("report/draft.md").read_text(encoding="utf-8").splitlines()
    body: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if line.startswith("|"):
            table_lines: list[str] = []
            while index < len(lines) and lines[index].startswith("|"):
                table_lines.append(lines[index])
                index += 1
            header_cells = [cell.strip() for cell in table_lines[0].strip("|").split("|")]
            alignments = ["left"] * len(header_cells)
            data_start = 1
            if len(table_lines) > 1 and set(
                table_lines[1].replace("|", "").replace("-", "").replace(":", "").strip()
            ) == set():
                alignments = parse_alignments(table_lines[1])
                data_start = 2
            body.append("<table><thead><tr>")
            for col, cell in enumerate(header_cells):
                align = alignments[col] if col < len(alignments) else "left"
                cls = ' class="num"' if align == "right" else ""
                body.append(f"<th{cls}>{format_inline(cell)}</th>")
            body.append("</tr></thead><tbody>")
            for row_line in table_lines[data_start:]:
                cells = [cell.strip() for cell in row_line.strip("|").split("|")]
                row_html = []
                for col, cell in enumerate(cells):
                    align = alignments[col] if col < len(alignments) else "left"
                    cls = ' class="num"' if align == "right" else ""
                    row_html.append(f"<td{cls}>{format_inline(cell)}</td>")
                body.append("<tr>" + "".join(row_html) + "</tr>")
            body.append("</tbody></table>")
            continue
        if line.startswith("- "):
            body.append("<ul>")
            while index < len(lines) and lines[index].startswith("- "):
                body.append(f"<li>{format_inline(lines[index][2:].strip())}</li>")
                index += 1
            body.append("</ul>")
            continue
        if line.startswith("# "):
            body.append(f"<h1>{format_inline(line[2:])}</h1>")
        elif line.startswith("## "):
            heading = line[3:]
            cls = ' class="page-start"' if heading.startswith(("3. ", "5. ")) else ""
            body.append(f"<h2{cls}>{format_inline(heading)}</h2>")
        elif line.strip():
            body.append(f"<p>{format_inline(line)}</p>")
        index += 1

    style = (
        "@page{size:A4;margin:14mm 15mm}"
        "body{font:10pt/1.44 Georgia,'Times New Roman',serif;color:#172334;"
        "max-width:780px;margin:auto}"
        "h1,h2{font-family:'Segoe UI',Arial,sans-serif;color:#0f1c2e;break-after:avoid}"
        "h1{font-size:19pt;margin:0 0 8px;border-bottom:2px solid #2b4c5e;padding-bottom:5px}"
        "h2{font-size:12.5pt;margin:16px 0 6px}"
        "h2.page-start{break-before:page;margin-top:0}"
        "p,li{margin:0 0 7px;orphans:3;widows:3}"
        "ul{margin:4px 0 8px;padding-left:20px}"
        "code{font-family:Consolas,'Courier New',monospace;font-size:8.6pt;"
        "background:#f1f4f7;padding:1px 4px;border-radius:3px}"
        "table{border-collapse:collapse;width:100%;font:8.2pt/1.32 'Segoe UI',Arial,sans-serif;"
        "margin:7px 0 10px;font-variant-numeric:tabular-nums}"
        "thead{display:table-header-group}"
        "th,td{padding:4.5px 6px;border-bottom:1px solid #cbd5e1;text-align:left;vertical-align:top}"
        "th{background:#eaf0f5;color:#0f1c2e;font-weight:600;border-bottom:1.5px solid #94a3b8}"
        "th.num,td.num{text-align:right;white-space:nowrap}"
        "tr{break-inside:avoid}"
        "tbody tr:nth-child(even){background:#f8fafc}"
    )
    html = (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        "<title>The Least Squares Showdown — Project Report</title>"
        f"<style>{style}</style></head><body>\n"
        + "\n".join(body)
        + "\n</body></html>\n"
    )
    Path("report/print.html").write_text(html, encoding="utf-8")


if __name__ == "__main__":
    main()
