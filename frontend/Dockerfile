# Build
FROM node:22-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration=production

# Serve with nginx
FROM nginx:alpine
COPY --from=build /app/dist/platinum-web /usr/share/nginx/html
# Optional: add your own nginx.conf if needed