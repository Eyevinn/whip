# Use Debian-based (glibc) Node image — required by @roamhq/wrtc prebuilt
# native binaries which link against glibc (ld-linux-x86-64.so.2).
# Do NOT switch to Alpine/musl variants; the wrtc native addon will fail.
FROM node:22-bookworm-slim

ADD . /app
WORKDIR /app
RUN npm install
RUN npx lerna bootstrap
RUN npm run build

CMD [ "npm", "start" ]
