# -------------------------------------------------------------
# 1) STAGE “builder”: construir la aplicación React
# -------------------------------------------------------------
    FROM node:18-alpine AS builder
    WORKDIR /app
    
    # Copiamos package.json y package-lock.json, instalamos dependencias
    COPY package*.json ./
    RUN npm ci
    
    # Copiar todo el código fuente y compilar
    COPY . .
    ENV CI=true
    RUN npm run build
    
    # -------------------------------------------------------------
    # 2) STAGE “nginx”: servir los estáticos en /hid
    # -------------------------------------------------------------
    FROM nginx:stable-alpine
    
    # Creamos la carpeta donde Nginx servirá los archivos
    RUN mkdir -p /var/www/hid
    
    # Copiamos los archivos compilados de React (build) a /var/www/hid
    COPY --from=builder /app/build /var/www/hid

    # Copiamos el nginx.conf personalizado
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    # Exponemos el puerto 80
    EXPOSE 80
    
    # Arrancamos Nginx en primer plano
    CMD ["nginx", "-g", "daemon off;"]
    