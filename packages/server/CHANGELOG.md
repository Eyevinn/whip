# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.14.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.13.2...@eyevinn/whip-endpoint@0.14.0) (2022-05-17)


### Features

* request a fixed channel name ([#61](https://github.com/Eyevinn/whip/issues/61)) ([4cf17c8](https://github.com/Eyevinn/whip/commit/4cf17c8e995f47caefeb837b5916e57c7d5472b1))
* update viewer protocol based on webrtc-http-playback-protocol ([#62](https://github.com/Eyevinn/whip/issues/62)) ([322eff2](https://github.com/Eyevinn/whip/commit/322eff28ab0937760499349d8557e2635adc77ae))



### [0.13.2](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.13.1...@eyevinn/whip-endpoint@0.13.2) (2022-05-10)


### Bug Fixes

* only teardown peer connection on failed state ([#58](https://github.com/Eyevinn/whip/issues/58)) ([b1029a4](https://github.com/Eyevinn/whip/commit/b1029a4b3d428b63b3a6d582e3c8de1147fdbd6f))



### [0.13.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.13.0...@eyevinn/whip-endpoint@0.13.1) (2022-05-10)


### Bug Fixes

* prevent server from crasching if viewer count from a channel that does not exist is requested ([#57](https://github.com/Eyevinn/whip/issues/57)) ([29a99dd](https://github.com/Eyevinn/whip/commit/29a99dd4ade39d7cacfc33923a35714a1cf8bafb))



## [0.13.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.12.0...@eyevinn/whip-endpoint@0.13.0) (2022-05-04)


### Features

* multi-period MPD ([#51](https://github.com/Eyevinn/whip/issues/51)) ([3b2a9ef](https://github.com/Eyevinn/whip/commit/3b2a9ef003316dc588b9747deac5a7464c57485a))


### Bug Fixes

* add missing xlink namespace ([#50](https://github.com/Eyevinn/whip/issues/50)) ([53f7c6a](https://github.com/Eyevinn/whip/commit/53f7c6aa9613d5115342e890b8ba3a46a568e132))
* added MPD attributes ([c0e736d](https://github.com/Eyevinn/whip/commit/c0e736dbea0289063ecc1139e50febf50ee2d570))



## [0.12.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.11.2...@eyevinn/whip-endpoint@0.12.0) (2022-04-14)


### Features

* **#48:** endpoint that returns an MPEG-DASH for a channel ([#49](https://github.com/Eyevinn/whip/issues/49)) ([279c0b0](https://github.com/Eyevinn/whip/commit/279c0b0135506b1f5c4cb1ec054da2fdbc075019)), closes [#48](https://github.com/Eyevinn/whip/issues/48) [#38](https://github.com/Eyevinn/whip/issues/38)
* support for TLS termination ([#42](https://github.com/Eyevinn/whip/issues/42)) ([9409adb](https://github.com/Eyevinn/whip/commit/9409adbb9ddad9b8e1e9546347d407bfe90bbb5f))
* trickle ICE from client ([#43](https://github.com/Eyevinn/whip/issues/43)) ([d08294f](https://github.com/Eyevinn/whip/commit/d08294f65e8ca73d11062d7c04914157204b832f))


### Bug Fixes

* possible to set ext port with env variable ([579123d](https://github.com/Eyevinn/whip/commit/579123dc5800055bdf4957f4fcad6f01e8d6116b))



### [0.11.2](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.11.1...@eyevinn/whip-endpoint@0.11.2) (2022-04-13)


### Bug Fixes

* remove broadcast channel when WHIP resource is destroyed ([fe81806](https://github.com/Eyevinn/whip/commit/fe8180663c9b47a42f370357c65609e6757f8eab))



### [0.11.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.11.0...@eyevinn/whip-endpoint@0.11.1) (2022-04-12)


### Bug Fixes

* support having different external port ([bebef93](https://github.com/Eyevinn/whip/commit/bebef935537a57fcb7d836762ac51f5ab65071cd))



## [0.11.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.10.1...@eyevinn/whip-endpoint@0.11.0) (2022-04-12)


### ⚠ BREAKING CHANGES

* ability to set hostname and interface IP (#39)

### Features

* ability to set hostname and interface IP ([#39](https://github.com/Eyevinn/whip/issues/39)) ([718d6d9](https://github.com/Eyevinn/whip/commit/718d6d9981b20b41c7fc1ebfd3ccdeaeef3ccdd5))



### [0.10.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.10.0...@eyevinn/whip-endpoint@0.10.1) (2022-04-12)


### Bug Fixes

* backchannel datachannel may not be created ([31b3dc9](https://github.com/Eyevinn/whip/commit/31b3dc99a5c1e114caff2af8c8414a4e6769f8fa))



## [0.10.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.9.0...@eyevinn/whip-endpoint@0.10.0) (2022-04-12)


### Features

* backchannel from viewer to sender using RTC DataChannel ([#33](https://github.com/Eyevinn/whip/issues/33)) ([a90b913](https://github.com/Eyevinn/whip/commit/a90b913587a612c22388f9c2e89d905054fb9440))



## [0.9.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.8.0...@eyevinn/whip-endpoint@0.9.0) (2022-04-11)


### ⚠ BREAKING CHANGES

* must explicitly specify which wrtc plugins to enable. And added some more logging

### Features

* must explicitly specify which wrtc plugins to enable. And added some more logging ([015c618](https://github.com/Eyevinn/whip/commit/015c618fc5845edf1122683c8c92414d4d31ddf7))



## [0.8.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.7.0...@eyevinn/whip-endpoint@0.8.0) (2022-04-09)


### ⚠ BREAKING CHANGES

* format of Link header is now more standard compliant

### Bug Fixes

* format of Link header is now more standard compliant ([fc7189f](https://github.com/Eyevinn/whip/commit/fc7189f32e86ba36dd8230bcd0b2018c996023df))



## [0.7.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.6.2...@eyevinn/whip-endpoint@0.7.0) (2022-04-09)


### Features

* support for handling protocol extensions ([#35](https://github.com/Eyevinn/whip/issues/35)) ([f5b0d66](https://github.com/Eyevinn/whip/commit/f5b0d6642f142f90222d8a16b8cc32e9636b2504))



### [0.6.2](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.6.1...@eyevinn/whip-endpoint@0.6.2) (2022-04-08)


### Bug Fixes

* need to clear connection timer when viewer has connected ([#32](https://github.com/Eyevinn/whip/issues/32)) ([6bcf85a](https://github.com/Eyevinn/whip/commit/6bcf85a2b756f3894156ffd455311289c1c14365))



### [0.6.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.6.0...@eyevinn/whip-endpoint@0.6.1) (2022-04-08)


### Bug Fixes

* do not crasch when sender is no longer available ([f4b1a52](https://github.com/Eyevinn/whip/commit/f4b1a528a777378aa8d20c088ee002d29b601be4))



## [0.6.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.5.3...@eyevinn/whip-endpoint@0.6.0) (2022-04-07)


### Features

* viewer count per channel ([#30](https://github.com/Eyevinn/whip/issues/30)) and fix of [#31](https://github.com/Eyevinn/whip/issues/31) ([397d378](https://github.com/Eyevinn/whip/commit/397d378892db44f525766d88dbbe35effa707025))



### [0.5.3](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.5.2...@eyevinn/whip-endpoint@0.5.3) (2022-04-07)


### Bug Fixes

* must remove track from senders when watcher disconnects ([#29](https://github.com/Eyevinn/whip/issues/29)) ([ccaad86](https://github.com/Eyevinn/whip/commit/ccaad86b6c73d0d04e407aa36095719eeb49b28b))



### [0.5.2](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.5.1...@eyevinn/whip-endpoint@0.5.2) (2022-04-06)

**Note:** Version bump only for package @eyevinn/whip-endpoint





### [0.5.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.5.0...@eyevinn/whip-endpoint@0.5.1) (2022-04-06)

**Note:** Version bump only for package @eyevinn/whip-endpoint





## [0.5.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.4.2...@eyevinn/whip-endpoint@0.5.0) (2022-04-06)


### ⚠ BREAKING CHANGES

* destroy resource (#14)

### Features

* destroy resource ([#14](https://github.com/Eyevinn/whip/issues/14)) ([7863203](https://github.com/Eyevinn/whip/commit/78632033657c54f3bb4c53067e62edc91d190341))



## [0.4.2](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.4.1...@eyevinn/whip-endpoint@0.4.2) (2022-04-04)


### Bug Fixes

* do not append port on server address ([5b85854](https://github.com/Eyevinn/whip/commit/5b8585490a88cf57555890f9df9923b784d046bb))





## [0.4.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.4.0...@eyevinn/whip-endpoint@0.4.1) (2022-04-04)

**Note:** Version bump only for package @eyevinn/whip-endpoint





# [0.4.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.3.6...@eyevinn/whip-endpoint@0.4.0) (2022-04-04)


### Bug Fixes

* remove broadcaster channel on disconnect ([#20](https://github.com/Eyevinn/whip/issues/20)) ([5a587c3](https://github.com/Eyevinn/whip/commit/5a587c31e420822f113d9d5eaccc362b145f45f6))


### Features

* prefetch ICE server config from endpoint ([#23](https://github.com/Eyevinn/whip/issues/23)) ([f890665](https://github.com/Eyevinn/whip/commit/f890665c66e35b067ed44a27ed3188457b06cd6b))
* return STUN/TURN list in header for OPTIONS and POST response ([#21](https://github.com/Eyevinn/whip/issues/21)) ([7f3d763](https://github.com/Eyevinn/whip/commit/7f3d763ddf033bc2b42d8d4040d3e132c919394a))
