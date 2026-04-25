from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HTML_IN = ROOT / "output/pdf/mealflo_hackathon_writeup_mealflo_style.html"
PDF_OUT = ROOT / "output/pdf/mealflo_hackathon_writeup_mealflo_style.pdf"
PUBLIC_OUT = ROOT / "public/mealflo-hackathon-writeup.pdf"


def build() -> None:
    PDF_OUT.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_OUT.parent.mkdir(parents=True, exist_ok=True)

    subprocess.run(
        [
            "playwright",
            "pdf",
            "--paper-format",
            "Letter",
            "--color-scheme",
            "light",
            HTML_IN.resolve().as_uri(),
            str(PDF_OUT),
        ],
        check=True,
        cwd=ROOT,
    )
    shutil.copyfile(PDF_OUT, PUBLIC_OUT)


if __name__ == "__main__":
    build()
