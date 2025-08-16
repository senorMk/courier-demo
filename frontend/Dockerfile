# Build
FROM node:22-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration=production

# Serve with nginx
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist/platinum-web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Optional: add your own nginx.conf if needed

EXPOSE 80