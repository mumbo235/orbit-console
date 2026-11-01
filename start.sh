#!/usr/bin/env bash
# Launch ORBIT as a desktop app. Pass --fullscreen to start fullscreen.
cd "$(dirname "$(readlink -f "$0")")" && exec ./node_modules/.bin/electron . "$@"
