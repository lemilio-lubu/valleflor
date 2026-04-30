FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build --workspace=@floricultura/web
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "start"]
