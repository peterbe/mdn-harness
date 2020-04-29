#!/bin/bash
set -e  # Exit on non-zero status
set -u  # Treat unset variables as an error

lighthouse-batch -f cloudfront-sites.txt --html --params "--only-categories=performance --preset perf --throttling.cpuSlowdownMultiplier=6"

yarn run merge-summaries report/lighthouse/summary.json
