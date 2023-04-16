# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.3.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@1.2.1...@eyevinn/whip-endpoint@1.3.0) (2023-04-16)


### Features

* if no hostname is set return relative WHIP resource URL ([#117](https://github.com/Eyevinn/whip/issues/117)) ([dd22f49](https://github.com/Eyevinn/whip/commit/dd22f497b71c3fd3fcb32c412e3cdfd72bc284c7))
* implemented getting sfu-config data from resource manager ([0bcb290](https://github.com/Eyevinn/whip/commit/0bcb290427493d2f929234a984e5b242f520986f))



### [1.2.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@1.2.0...@eyevinn/whip-endpoint@1.2.1) (2023-02-20)


### Bug Fixes

* endpoint should return 405 on GET/HEAD/PUT ([#103](https://github.com/Eyevinn/whip/issues/103)) ([f7aeced](https://github.com/Eyevinn/whip/commit/f7aecedc61246fee7d28a2b86ca7f7cd7f4017fc))
* include accept-post header in options response ([#104](https://github.com/Eyevinn/whip/issues/104)) ([56c3002](https://github.com/Eyevinn/whip/commit/56c300240857ede2e820f608ce8116739b8ebefc))
* whip endpoint doesn't contain full path ([#101](https://github.com/Eyevinn/whip/issues/101)) ([34511a5](https://github.com/Eyevinn/whip/commit/34511a5c779c894fccc1d5f4f3e9c9344a694173))



## [1.2.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@1.1.0...@eyevinn/whip-endpoint@1.2.0) (2022-09-27)


### Features

* handle WHIP endpoints not supporting trickle ICE ([#97](https://github.com/Eyevinn/whip/issues/97)) ([a971a98](https://github.com/Eyevinn/whip/commit/a971a98a8245a479c4e4014f1f2eb81d3d5eaf16))



## [1.1.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@1.0.1...@eyevinn/whip-endpoint@1.1.0) (2022-09-19)

**Note:** Version bump only for package @eyevinn/whip-endpoint





### [1.0.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@1.0.0...@eyevinn/whip-endpoint@1.0.1) (2022-09-15)


### Bug Fixes

* use sfu api key if present ([#91](https://github.com/Eyevinn/whip/issues/91)) ([7aa048f](https://github.com/Eyevinn/whip/commit/7aa048f4362b9af390c01461d47c625ad6424213))



## [1.0.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.15.1...@eyevinn/whip-endpoint@1.0.0) (2022-09-09)


### ⚠ BREAKING CHANGES

* support origin/edge sfu topologies (#88)

### Features

* support origin/edge sfu topologies ([#88](https://github.com/Eyevinn/whip/issues/88)) ([dd8ffde](https://github.com/Eyevinn/whip/commit/dd8ffde5e76193d25a021dd2fd9bada11e9ace2a))



### [0.15.1](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.15.0...@eyevinn/whip-endpoint@0.15.1) (2022-08-31)


### Bug Fixes

* need to export BroadcasterClient ([cccc240](https://github.com/Eyevinn/whip/commit/cccc240279d24c4d9ae2a6969fe616904e653f4b))



## [0.15.0](https://github.com/Eyevinn/whip/compare/@eyevinn/whip-endpoint@0.14.0...@eyevinn/whip-endpoint@0.15.0) (2022-08-30)


### Features

* add entity-tag header support ([b0c3da9](https://github.com/Eyevinn/whip/commit/b0c3da9424856e6baca5bd4ace5019b7c9d2d4c9))
* possibility to separate WHIP from egress endpoint ([#86](https://github.com/Eyevinn/whip/issues/86)) ([579ac55](https://github.com/Eyevinn/whip/commit/579ac55e1eff52b419c51d6779932578980e034a))
* RTMP module for restreaming to RTMP endpoint ([#64](https://github.com/Eyevinn/whip/issues/64)) ([376c220](https://github.com/Eyevinn/whip/commit/376c220fc231a9455087d16087a46a66a05bfffd))
* support local sfu ([fea72e1](https://github.com/Eyevinn/whip/commit/fea72e194eb3306239cad2ba6d08f5b057aee54d))


### Bug Fixes

* actually support application/whpp+json content type as the standard says ([#68](https://github.com/Eyevinn/whip/issues/68)) ([0f2a41e](https://github.com/Eyevinn/whip/commit/0f2a41e4ac8874b4372e1c93edd5949d9aef0e6f))
* fix formatting issue with srflx candidates ([#85](https://github.com/Eyevinn/whip/issues/85)) ([6dfc38f](https://github.com/Eyevinn/whip/commit/6dfc38f6809b33de062c23b493254a760c781671))
* handle missing label/mslabel ([2c24383](https://github.com/Eyevinn/whip/commit/2c24383be8c96a5f10788094b7caef81b4e988bd))
* handle offers from mpegts-client in sfu mode ([#74](https://github.com/Eyevinn/whip/issues/74)) ([b877a29](https://github.com/Eyevinn/whip/commit/b877a29584b4042c64badb3b46a275663d65533d))
* handle uncaught exception without crashing ([#77](https://github.com/Eyevinn/whip/issues/77)) ([43c9ebf](https://github.com/Eyevinn/whip/commit/43c9ebf1577bf1a77f434510cb7c4c9c02660b5a))
* ice candidate foundation -> string ([fb41d19](https://github.com/Eyevinn/whip/commit/fb41d19919186db1e41a49283c0a44eaf8fefe61))
* possible to set Symphony Media Bridge URL ([#76](https://github.com/Eyevinn/whip/issues/76)) ([2c3871b](https://github.com/Eyevinn/whip/commit/2c3871bbf3ccdc8885c1d48e42b0d287bc63c68a))
* return error code if PATCH is not supported ([#79](https://github.com/Eyevinn/whip/issues/79)) ([166a058](https://github.com/Eyevinn/whip/commit/166a05835f13e49b1b6abc4c4683e9be4ae0309a))
* safari compatibility with sfu ([#71](https://github.com/Eyevinn/whip/issues/71)) ([76f871a](https://github.com/Eyevinn/whip/commit/76f871acc4b6265d3049e72628e95df0bf18bff0))
* use fork of wrtc library for support on apple silicon ([#83](https://github.com/Eyevinn/whip/issues/83)) ([3cdd9ee](https://github.com/Eyevinn/whip/commit/3cdd9ee8e3522385c032d2bac919dad285e977df))
* WHPP viewer endpoint should signal if PATCH method is allowed ([#81](https://github.com/Eyevinn/whip/issues/81)) ([1aa13db](https://github.com/Eyevinn/whip/commit/1aa13db5987492027ba12ab59fcebee06f6761d4))



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
