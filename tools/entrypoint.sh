#!/bin/bash

UDP_PORT=$1
#TCP_PORT=$2

cat > config.json << EOF
{
  "logStdOut" : true,
  "port" : 8080,
  "logLevel": "INFO",
  "ice.singlePort": ${UDP_PORT},
  "ice.udpPortRangeLow": 10006,
  "ice.udpPortRangeHigh": 11000,
  "ice.tcp.enable": false,
  "defaultLastN": 1,
  "rctl.enable": true,
  "rctl.debugLog": false,
  "mixerInactivityTimeoutMs": 30000
}
EOF

./smb config.json
