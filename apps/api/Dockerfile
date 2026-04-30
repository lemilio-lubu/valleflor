FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build --workspace=@floricultura/api
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["npm", "start"]
