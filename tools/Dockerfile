# syntax=docker/dockerfile:1
FROM ubuntu:focal
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get -y update
RUN apt-get -y install git cmake llvm clang libc++-dev libc++abi-dev libssl-dev libsrtp2-dev libmicrohttpd-dev libopus-dev
WORKDIR /src
ADD build.sh ./build.sh
RUN ./build.sh

FROM ubuntu:focal
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get -y update
RUN apt-get -y install libc++-dev libc++abi-dev libsrtp2-1 libmicrohttpd12 libopus0 libssl1.1

WORKDIR /app
COPY --from=0 /src/SymphonyMediaBridge/smb ./smb
ADD entrypoint.sh ./entrypoint.sh

RUN echo "* - rtprio 99" >> /etc/security/limits.conf

ENTRYPOINT ["./entrypoint.sh"]
