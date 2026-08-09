# Setup (one time)

## 1. Python virtual environment

```bash
python3 -m venv ~/qp_env
source ~/qp_env/bin/activate
pip install requests Pillow
```

Every time you open a new terminal, activate it again before running any script:
```bash
source ~/qp_env/bin/activate
```

## 2. LaTeX (only needed for the workbook)

If you're on macOS and don't have it:
```bash
brew install --cask mactex-no-gui
```

Or use [Overleaf](https://overleaf.com) — upload the generated `.tex` files there.

If `pdflatex` complains about a missing package, install it:
```bash
sudo tlmgr install <package-name>
```

The current scripts only need standard packages (`amsmath`, `graphicx`, `hyperref`, `fancyhdr`, etc.) which all ship with MacTeX / TeX Live.
