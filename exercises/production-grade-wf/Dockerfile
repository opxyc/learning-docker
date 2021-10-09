FROM node:alpine AS builder
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine AS server
EXPOSE 80
COPY --from=builder /app/build /usr/share/nginx/html
# see the doc: https://hub.docker.com/_/nginx to see where to
# put the files to serve