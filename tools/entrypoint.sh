#!/bin/bash

cat > config.json << EOF
{
  "logStdOut" : true,
  "port" : ${HTTP_PORT},
  "logLevel": "INFO",
  "ice.singlePort": ${UDP_PORT},
  "ice.udpPortRangeLow": 10006,
  "ice.udpPortRangeHigh": 11000,
  "ice.tcp.enable": false,
  "ice.publicIpv4": ${IPV4_ADDR},
  "ice.publicIpv6": ${IPV6_ADDR},
  "defaultLastN": 1,
  "rctl.enable": true,
  "rctl.debugLog": false,
  "mixerInactivityTimeoutMs": 30000
}
EOF

./smb config.json
