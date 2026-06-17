# Stage 1: Build React Client Bundle
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json tsconfig.json vite.config.ts ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve compiled files using Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
