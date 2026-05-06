FROM nginx:alpine

# Копируем статические файлы в директорию Nginx
COPY ./index.html /usr/share/nginx/html/index.html
COPY ./script.js /usr/share/nginx/html/script.js
COPY ./styles.css /usr/share/nginx/html/styles.css
COPY ./images /usr/share/nginx/html/images

# Копируем конфигурацию Nginx, если она есть
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]