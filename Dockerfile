FROM node:16-slim

ADD . /app
WORKDIR /app
RUN npm install
RUN npx lerna bootstrap
RUN npm run build

CMD [ "npm", "start" ]
