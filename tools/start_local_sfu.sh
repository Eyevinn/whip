#!/bin/bash

if [ ! -d "SymphonyMediaBridge" ]; then
    git clone https://github.com/marcusspangenberg/SymphonyMediaBridge.git
fi
pushd SymphonyMediaBridge
git fetch -p
git checkout marcus/dynamic_payload_types
git pull
CC=clang CXX=clang++ cmake -DCMAKE_BUILD_TYPE=Release -G "Unix Makefiles" .
CC=clang CXX=clang++ make -j5
popd

SymphonyMediaBridge/smb ./config.json
