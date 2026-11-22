#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
python3 -m venv .venv-jobspy
.venv-jobspy/bin/python -m pip install -r scripts/collectors/requirements.txt
