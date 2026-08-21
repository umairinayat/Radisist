#!/usr/bin/env bash
# Per-action scripts invoked by the Django cpanel. Kept separate so the Django
# process never shells out to arbitrary user input; it only calls these by name.
set -euo pipefail
