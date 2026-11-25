#!/usr/bin/env python3
"""Genera i due modelli vuoti da 1.800 posizioni per pagina, senza dipendenze."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile, ZipInfo

DEST = Path(__file__).resolve().parents[1] / 'assets' / 'templates'
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
RELS = 'http://schemas.openxmlformats.org/package/2006/relationships'
ODT = 'application/vnd.oasis.opendocument.text'
ODF = '''xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2"'''

# Una posizione è 7,2 pt in Courier New 12. L'area utile è 434 × 720 pt.
# I 2 pt oltre i 432 teorici assorbono gli arrotondamenti tra i programmi.
# I margini DOCX sono in ventesimi di punto. In ODT sono espressi in punti.
STILE_WORD = '''<w:pPr><w:widowControl w:val="0"/><w:spacing w:before="0" w:after="0" w:line="480" w:lineRule="exact"/>
<w:ind w:left="0" w:right="0" w:firstLine="0"/><w:jc w:val="left"/></w:pPr>'''
TESTO = 'Inizia qui il manoscritto.'


def scrivi_zip(nome, file, senza_compressione=()):
    with ZipFile(DEST / nome, 'w') as archivio:
        for percorso, contenuto in file.items():
            info = ZipInfo(percorso)
            info.compress_type = ZIP_STORED if percorso in senza_compressione else ZIP_DEFLATED
            archivio.writestr(info, contenuto)


def docx():
    scrivi_zip('manoscritto-1800-effinge.docx', {
        '[Content_Types].xml': '''<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>''',
        '_rels/.rels': f'<Relationships xmlns="{RELS}"><Relationship Id="rId1" Type="{R}/officeDocument" Target="word/document.xml"/></Relationships>',
        'word/_rels/document.xml.rels': f'''<Relationships xmlns="{RELS}">
<Relationship Id="rId1" Type="{R}/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="{R}/settings" Target="settings.xml"/></Relationships>''',
        'word/document.xml': f'''<w:document xmlns:w="{W}"><w:body>
<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>{TESTO}</w:t></w:r></w:p>
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>
<w:pgMar w:top="1219" w:right="1613" w:bottom="1219" w:left="1613" w:header="600" w:footer="600" w:gutter="0"/>
</w:sectPr></w:body></w:document>''',
        'word/styles.xml': f'''<w:styles xmlns:w="{W}">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>{STILE_WORD}
<w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:eastAsia="Courier New" w:cs="Courier New"/>
<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="it-IT"/></w:rPr></w:style></w:styles>''',
        'word/settings.xml': f'<w:settings xmlns:w="{W}"><w:autoHyphenation w:val="0"/></w:settings>',
    })


def odt():
    scrivi_zip('manoscritto-1800-effinge.odt', {
        'mimetype': ODT,
        'META-INF/manifest.xml': f'''<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
<manifest:file-entry manifest:full-path="/" manifest:media-type="{ODT}" manifest:version="1.2"/>
<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
</manifest:manifest>''',
        'content.xml': f'''<office:document-content {ODF}>
<office:body><office:text><text:p text:style-name="Standard">{TESTO}</text:p></office:text></office:body>
</office:document-content>''',
        'styles.xml': f'''<office:document-styles {ODF} xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0">
<office:font-face-decls><style:font-face style:name="Courier New" svg:font-family="Courier New" style:font-family-generic="modern" style:font-pitch="fixed"/></office:font-face-decls>
<office:styles><style:style style:name="Standard" style:family="paragraph" style:master-page-name="Manoscritto">
<style:paragraph-properties fo:line-height="24pt" fo:margin-top="0pt" fo:margin-bottom="0pt" fo:text-indent="0pt" fo:text-align="start" fo:widows="0" fo:orphans="0"/>
<style:text-properties style:font-name="Courier New" fo:font-size="12pt" fo:language="it" fo:country="IT" fo:hyphenate="false"/>
</style:style></office:styles>
<office:automatic-styles><style:page-layout style:name="A4"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm"
fo:margin-left="80.63pt" fo:margin-right="80.63pt" fo:margin-top="60.94pt" fo:margin-bottom="60.94pt" style:print-orientation="portrait"/></style:page-layout></office:automatic-styles>
<office:master-styles><style:master-page style:name="Manoscritto" style:page-layout-name="A4"/></office:master-styles>
</office:document-styles>''',
    }, senza_compressione=('mimetype',))


if __name__ == '__main__':
    DEST.mkdir(parents=True, exist_ok=True)
    docx()
    odt()
