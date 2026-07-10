#!/bin/bash
# Run this script after setting up the project to generate PWA icons
# Requires imagemagick: brew install imagemagick  OR  apt-get install imagemagick

convert -size 192x192 xc:#1B4F8A \
  -font DejaVu-Sans-Bold -pointsize 72 -fill white \
  -gravity center -annotate 0 "AAS" \
  icon-192.png

convert -size 512x512 xc:#1B4F8A \
  -font DejaVu-Sans-Bold -pointsize 180 -fill white \
  -gravity center -annotate 0 "AAS" \
  icon-512.png

echo "Icons generated."
