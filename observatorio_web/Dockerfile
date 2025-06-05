# -------------------------------------------------------------
# 1) STAGE “builder”: construir la aplicación React
# -------------------------------------------------------------
    FROM node:18-alpine AS builder
    WORKDIR /app
    
    COPY package*.json ./
    RUN npm ci

    COPY . .
    ENV CI=true
    RUN npm run build
    
    # -------------------------------------------------------------
    # 2) STAGE “nginx”: servir los estáticos en /hid
    # -------------------------------------------------------------
    FROM nginx:stable-alpine
    
    RUN mkdir -p /var/www/hid
    
    COPY --from=builder /app/build /var/www/hid

    COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    EXPOSE 80
    
    CMD ["nginx", "-g", "daemon off;"]
    