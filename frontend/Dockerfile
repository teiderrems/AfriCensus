FROM node:24-alpine AS build

WORKDIR /app
COPY package*.json angular.json tsconfig*.json postcss.config.json proxy.conf.json ./
COPY src ./src
RUN npm ci
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/africensus-link/browser /usr/share/nginx/html

EXPOSE 80
