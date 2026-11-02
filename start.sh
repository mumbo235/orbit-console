#!/usr/bin/env bash
# Launch ORBIT as a desktop app. Pass --fullscreen to start fullscreen.
# ELECTRON_RUN_AS_NODE (set by some tools) would start Electron as plain Node and the window would never open.
unset ELECTRON_RUN_AS_NODE
cd "$(dirname "$(readlink -f "$0")")" && exec ./node_modules/.bin/electron . "$@"
