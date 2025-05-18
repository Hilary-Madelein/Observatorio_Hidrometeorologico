# 1) Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copiamos package.json y package-lock.json y sólo instalamos deps de prod y dev para build
COPY package*.json ./
RUN npm ci

# Copiamos el resto y construimos
COPY . .
ENV CI=true
RUN npm run build

# 2) Production stage: servir con nginx
FROM nginx:stable-alpine
# Eliminamos configuración default de nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiamos un config mínimo que haga proxy a /api si fuese necesario
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copiamos build estático desde el builder
COPY --from=builder /app/build /usr/share/nginx/html

# Exponemos el puerto 80
EXPOSE 80

# Arranque de nginx en foreground
CMD ["nginx", "-g", "daemon off;"]
