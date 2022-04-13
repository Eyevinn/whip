FROM node:14-slim

ADD . /app
WORKDIR /app
RUN npm install
RUN npx lerna bootstrap
RUN npm run build

CMD [ "npm", "start" ]
