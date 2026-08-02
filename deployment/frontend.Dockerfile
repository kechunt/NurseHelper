FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV NG_APP_API_URL=/api
RUN npm run build:prod

FROM nginx:1.28-alpine
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/NurseHelper/browser/ /usr/share/nginx/html/

EXPOSE 80
