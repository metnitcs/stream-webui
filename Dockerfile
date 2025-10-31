FROM node:18-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Build frontend first
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

COPY frontend/ ./
ENV VITE_BACKEND_URL=https://stream-webui-production.up.railway.app
RUN npm run build
RUN ls -la dist/

# Setup backend
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ ./

# Copy frontend build
RUN cp -r frontend/dist/* public/ 2>/dev/null || mkdir -p public && cp -r frontend/dist/* public/
RUN ls -la public/

# Create uploads directory
RUN mkdir -p uploads

EXPOSE $PORT

CMD ["node", "server.js"]