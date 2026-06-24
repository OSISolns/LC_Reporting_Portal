#!/bin/bash
cd "$(git rev-parse --show-toplevel)"
git add -A
git commit -m "perf: memoize react ui logs, optimize sync cpu hash map, enforce ward neutrality, and format stock changes"
git push
