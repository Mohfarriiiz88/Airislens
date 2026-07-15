from __future__ import annotations

from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "airislens-manual-book.md"
OUTPUT = ROOT / "Manual_Book_AIRISLENS.docx"


def sanitize_text(text: str) -> str:
    return escape(text.replace("**", ""))


def run_props(*, bold: bool = False, size: int | None = None) -> str:
    props: list[str] = []
    if bold:
        props.append("<w:b/>")
    if size is not None:
        props.append(f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>')
    if not props:
        return ""
    return f"<w:rPr>{''.join(props)}</w:rPr>"


def paragraph(
    text: str,
    *,
    bold: bool = False,
    size: int | None = None,
    center: bool = False,
    page_break_before: bool = False,
    indent: int | None = None,
    spacing_before: int | None = None,
    spacing_after: int | None = None,
) -> str:
    ppr_parts: list[str] = []
    if center:
        ppr_parts.append('<w:jc w:val="center"/>')
    if indent is not None:
        ppr_parts.append(f'<w:ind w:left="{indent}"/>')
    if spacing_before is not None or spacing_after is not None:
        before = f' w:before="{spacing_before}"' if spacing_before is not None else ""
        after = f' w:after="{spacing_after}"' if spacing_after is not None else ""
        ppr_parts.append(f"<w:spacing{before}{after}/>")
    ppr = f"<w:pPr>{''.join(ppr_parts)}</w:pPr>" if ppr_parts else ""

    run_parts: list[str] = []
    if page_break_before:
        run_parts.append('<w:r><w:br w:type="page"/></w:r>')
    text_xml = sanitize_text(text)
    if text_xml:
        run_parts.append(
            f'<w:r>{run_props(bold=bold, size=size)}<w:t xml:space="preserve">{text_xml}</w:t></w:r>'
        )
    return f"<w:p>{ppr}{''.join(run_parts)}</w:p>"


def build_document_xml(lines: list[str]) -> str:
    paragraphs: list[str] = []
    first_heading = True

    for raw_line in lines:
        line = raw_line.rstrip("\n")
        stripped = line.strip()

        if stripped == "[[PAGEBREAK]]":
            paragraphs.append(paragraph("", page_break_before=True))
            continue

        if not stripped:
            paragraphs.append(paragraph("", spacing_after=80))
            continue

        if stripped.startswith("# "):
            title = stripped[2:].strip()
            if first_heading:
                paragraphs.append(
                    paragraph(
                        title,
                        bold=True,
                        size=34,
                        center=True,
                        spacing_before=120,
                        spacing_after=200,
                    )
                )
                first_heading = False
            else:
                paragraphs.append(
                    paragraph(
                        title,
                        bold=True,
                        size=30,
                        spacing_before=220,
                        spacing_after=120,
                    )
                )
            continue

        if stripped.startswith("## "):
            paragraphs.append(
                paragraph(
                    stripped[3:].strip(),
                    bold=True,
                    size=28,
                    spacing_before=200,
                    spacing_after=100,
                )
            )
            continue

        if stripped.startswith("### "):
            paragraphs.append(
                paragraph(
                    stripped[4:].strip(),
                    bold=True,
                    size=24,
                    spacing_before=160,
                    spacing_after=80,
                )
            )
            continue

        if stripped.startswith("- "):
            paragraphs.append(
                paragraph(
                    f"• {stripped[2:].strip()}",
                    size=22,
                    indent=720,
                    spacing_after=40,
                )
            )
            continue

        numbered = False
        for marker in [f"{n}." for n in range(1, 100)]:
            if stripped.startswith(f"{marker} "):
                paragraphs.append(
                    paragraph(
                        stripped,
                        size=22,
                        indent=720,
                        spacing_after=40,
                    )
                )
                numbered = True
                break
        if numbered:
            continue

        paragraphs.append(paragraph(stripped, size=22, spacing_after=60))

    section_props = (
        "<w:sectPr>"
        '<w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1417" w:right="1134" w:bottom="1417" w:left="1134" '
        'w:header="708" w:footer="708" w:gutter="0"/>'
        "</w:sectPr>"
    )

    body = "".join(paragraphs) + section_props
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" '
        'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
        'xmlns:o="urn:schemas-microsoft-com:office:office" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
        'xmlns:v="urn:schemas-microsoft-com:vml" '
        'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" '
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
        'xmlns:w10="urn:schemas-microsoft-com:office:word" '
        'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
        'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" '
        'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" '
        'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" '
        'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
        'mc:Ignorable="w14 wp14">'
        f"<w:body>{body}</w:body>"
        "</w:document>"
    )


def generate_docx() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Source markdown not found: {SOURCE}")

    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    document_xml = build_document_xml(lines)

    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"""

    core = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Manual Book AIRISLENS</dc:title>
  <dc:creator>OpenAI Codex CLI</dc:creator>
  <cp:lastModifiedBy>OpenAI Codex CLI</cp:lastModifiedBy>
</cp:coreProperties>"""

    app = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>OpenAI Codex CLI</Application>
</Properties>"""

    with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", rels)
        archive.writestr("word/document.xml", document_xml)
        archive.writestr("docProps/core.xml", core)
        archive.writestr("docProps/app.xml", app)


if __name__ == "__main__":
    generate_docx()
    print(f"Created: {OUTPUT}")
