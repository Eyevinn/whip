#!/bin/bash

git clone https://github.com/marcusspangenberg/SymphonyMediaBridge.git
pushd SymphonyMediaBridge
CC=clang CXX=clang++ cmake -DCMAKE_BUILD_TYPE=Release -G "Unix Makefiles" .
CC=clang CXX=clang++ make -j5
popd
