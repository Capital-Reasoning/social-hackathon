from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

from reportlab.lib.pagesizes import landscape, letter
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
HTML_IN = ROOT / "output/pdf/mealflo_hackathon_writeup_mealflo_style.html"
PDF_OUT = ROOT / "output/pdf/mealflo_hackathon_writeup_mealflo_style.pdf"
PUBLIC_OUT = ROOT / "public/mealflo-hackathon-writeup.pdf"
PAGE_W, PAGE_H = landscape(letter)


def page_index(path: Path) -> int:
    return int(path.stem.rsplit("-", 1)[1])


def assemble_flat_pdf(page_images: list[Path], output_path: Path) -> None:
    pdf = canvas.Canvas(str(output_path), pagesize=landscape(letter), pageCompression=1)
    pdf.setTitle("Mealflo Hackathon Writeup")
    pdf.setAuthor("Mealflo")
    for image_path in page_images:
        pdf.drawImage(str(image_path), 0, 0, width=PAGE_W, height=PAGE_H)
        pdf.showPage()
    pdf.save()


def build() -> None:
    PDF_OUT.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_OUT.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="mealflo-writeup-") as tmp:
        tmp_dir = Path(tmp)
        vector_pdf = tmp_dir / "source.pdf"
        image_prefix = tmp_dir / "page"

        subprocess.run(
            [
                "playwright",
                "pdf",
                "--paper-format",
                "Letter",
                "--color-scheme",
                "light",
                HTML_IN.resolve().as_uri(),
                str(vector_pdf),
            ],
            check=True,
            cwd=ROOT,
        )
        subprocess.run(
            [
                "pdftoppm",
                "-jpeg",
                "-r",
                "150",
                "-jpegopt",
                "quality=92,optimize=y",
                str(vector_pdf),
                str(image_prefix),
            ],
            check=True,
            cwd=ROOT,
        )
        page_images = sorted(tmp_dir.glob("page-*.jpg"), key=page_index)
        assemble_flat_pdf(page_images, PDF_OUT)
    shutil.copyfile(PDF_OUT, PUBLIC_OUT)


if __name__ == "__main__":
    build()
