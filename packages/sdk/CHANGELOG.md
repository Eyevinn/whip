# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.1.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@1.0.1...@eyevinn/whip-web-client@1.1.0) (2022-09-27)


### Features

* handle WHIP endpoints not supporting trickle ICE ([#97](https://github.com/Eyevinn/whip/issues/97)) ([a971a98](https://github.com/Eyevinn/whip/commit/a971a98a8245a479c4e4014f1f2eb81d3d5eaf16))



### [1.0.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@1.0.0...@eyevinn/whip-web-client@1.0.1) (2022-09-15)

**Note:** Version bump only for package @eyevinn/whip-web-client





## [1.0.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.10.0...@eyevinn/whip-web-client@1.0.0) (2022-09-09)


### ⚠ BREAKING CHANGES

* support origin/edge sfu topologies (#88)

### Features

* support origin/edge sfu topologies ([#88](https://github.com/Eyevinn/whip/issues/88)) ([dd8ffde](https://github.com/Eyevinn/whip/commit/dd8ffde5e76193d25a021dd2fd9bada11e9ace2a))



## [0.10.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.9.1...@eyevinn/whip-web-client@0.10.0) (2022-08-30)


### Features

* add entity-tag header support ([b0c3da9](https://github.com/Eyevinn/whip/commit/b0c3da9424856e6baca5bd4ace5019b7c9d2d4c9))


### Bug Fixes

* use fork of wrtc library for support on apple silicon ([#83](https://github.com/Eyevinn/whip/issues/83)) ([3cdd9ee](https://github.com/Eyevinn/whip/commit/3cdd9ee8e3522385c032d2bac919dad285e977df))



### [0.9.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.9.0...@eyevinn/whip-web-client@0.9.1) (2022-05-05)


### Bug Fixes

* remove logged error in generated js output ([6c005f0](https://github.com/Eyevinn/whip/commit/6c005f065a20d8022ca160116df0a6428be0095c))



## [0.9.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.8.0...@eyevinn/whip-web-client@0.9.0) (2022-05-04)


### Features

* unit test framework for sdk ([#52](https://github.com/Eyevinn/whip/issues/52)) ([409f536](https://github.com/Eyevinn/whip/commit/409f536ffaabc476fd0ce2fb6a749ea66a65bacd))


### Bug Fixes

* make client injected dependencies optional ([f3991d5](https://github.com/Eyevinn/whip/commit/f3991d5e408142fb80c85a9922cb7de823edb7aa))



## [0.8.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.7.1...@eyevinn/whip-web-client@0.8.0) (2022-04-14)


### Features

* **#48:** endpoint that returns an MPEG-DASH for a channel ([#49](https://github.com/Eyevinn/whip/issues/49)) ([279c0b0](https://github.com/Eyevinn/whip/commit/279c0b0135506b1f5c4cb1ec054da2fdbc075019)), closes [#48](https://github.com/Eyevinn/whip/issues/48) [#38](https://github.com/Eyevinn/whip/issues/38)
* trickle ICE from client ([#43](https://github.com/Eyevinn/whip/issues/43)) ([d08294f](https://github.com/Eyevinn/whip/commit/d08294f65e8ca73d11062d7c04914157204b832f))



### [0.7.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.7.0...@eyevinn/whip-web-client@0.7.1) (2022-04-13)


### Bug Fixes

* use ICE gather state to detect gathering complete ([#40](https://github.com/Eyevinn/whip/issues/40)) ([21569d8](https://github.com/Eyevinn/whip/commit/21569d8e71e150443337acd43592d808fce51fcf))



## [0.7.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.6.1...@eyevinn/whip-web-client@0.7.0) (2022-04-12)


### Features

* backchannel from viewer to sender using RTC DataChannel ([#33](https://github.com/Eyevinn/whip/issues/33)) ([a90b913](https://github.com/Eyevinn/whip/commit/a90b913587a612c22388f9c2e89d905054fb9440))


### Reverts

* Revert "Using ICE gathering state change to detect gathering complete" ([f206b62](https://github.com/Eyevinn/whip/commit/f206b6210e06afd820e02fcbbcf472bf36d2b8d0))



### [0.6.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.6.0...@eyevinn/whip-web-client@0.6.1) (2022-04-09)


### Bug Fixes

* free up resources on destroy and disconnect ([#36](https://github.com/Eyevinn/whip/issues/36)) ([33b0953](https://github.com/Eyevinn/whip/commit/33b09534c950628ec2584846ae2ea34b964c5aa7))



## [0.6.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.5.0...@eyevinn/whip-web-client@0.6.0) (2022-04-09)


### Features

* support for handling protocol extensions ([#35](https://github.com/Eyevinn/whip/issues/35)) ([f5b0d66](https://github.com/Eyevinn/whip/commit/f5b0d6642f142f90222d8a16b8cc32e9636b2504))



## [0.5.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.4.2...@eyevinn/whip-web-client@0.5.0) (2022-04-07)


### ⚠ BREAKING CHANGES

* ICE gathering timeout (#27)

### Features

* ICE gathering timeout ([#27](https://github.com/Eyevinn/whip/issues/27)) ([4823b29](https://github.com/Eyevinn/whip/commit/4823b29d2c8874c9decbf95a9b508efc23d67451))



### [0.4.2](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.4.1...@eyevinn/whip-web-client@0.4.2) (2022-04-06)

**Note:** Version bump only for package @eyevinn/whip-web-client





### [0.4.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.4.0...@eyevinn/whip-web-client@0.4.1) (2022-04-06)

**Note:** Version bump only for package @eyevinn/whip-web-client





## [0.4.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.3.2...@eyevinn/whip-web-client@0.4.0) (2022-04-06)


### ⚠ BREAKING CHANGES

* destroy resource (#14)

### Features

* destroy resource ([#14](https://github.com/Eyevinn/whip/issues/14)) ([7863203](https://github.com/Eyevinn/whip/commit/78632033657c54f3bb4c53067e62edc91d190341))


### Bug Fixes

* updated SDK documentation to reflect the new API ([#26](https://github.com/Eyevinn/whip/issues/26)) ([7a52b5f](https://github.com/Eyevinn/whip/commit/7a52b5f37ff5b25dfde0513488226b4aa3d8d30f))



## [0.3.2](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.3.1...@eyevinn/whip-web-client@0.3.2) (2022-04-04)


### Bug Fixes

* wrong default STUN address ([f5d3142](https://github.com/Eyevinn/whip/commit/f5d3142e97813d3c54aa19a59e54bbf058702405))





## [0.3.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.3.0...@eyevinn/whip-web-client@0.3.1) (2022-04-04)


### Bug Fixes

* added missing file ([74a06fa](https://github.com/Eyevinn/whip/commit/74a06fa2caa3b37d5fd1e0c3217312c35e2ba9c2))





# [0.3.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-web-client@0.2.1...@eyevinn/whip-web-client@0.3.0) (2022-04-04)


### Features

* prefetch ICE server config from endpoint ([#23](https://github.com/Eyevinn/whip/issues/23)) ([f890665](https://github.com/Eyevinn/whip/commit/f890665c66e35b067ed44a27ed3188457b06cd6b))
