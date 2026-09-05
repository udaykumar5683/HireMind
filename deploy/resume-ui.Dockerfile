FROM node:22-alpine AS build

WORKDIR /app
COPY "Resume Parser/Resume Parser/package.json" "Resume Parser/Resume Parser/package-lock.json" ./
RUN npm ci
COPY "Resume Parser/Resume Parser" ./
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/resume-ui.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

