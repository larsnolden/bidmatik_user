FROM node:12.8

Copy ./ /app
WORKDIR /app
Run npm install
EXPOSE 8080
CMD ["npm", "start"]
