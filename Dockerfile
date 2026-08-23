FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose HTTP port for health checks
EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
