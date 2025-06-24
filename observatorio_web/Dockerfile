# Etapa 1: build de React
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: nginx con tu build en /usr/share/nginx/html/hid
FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/nginx.conf

# Copiamos la carpeta build/ dentro de html/hid
RUN mkdir -p /usr/share/nginx/html/hid
COPY --from=builder /app/build /usr/share/nginx/html/hid

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
