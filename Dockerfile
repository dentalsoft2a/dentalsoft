# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# DS-Core environment variables
ARG VITE_DSCORE_CLIENT_ID
ARG VITE_DSCORE_CLIENT_SECRET
ARG VITE_DSCORE_ENVIRONMENT
ARG VITE_DSCORE_SANDBOX_BASE_HOST
ARG VITE_DSCORE_SANDBOX_AUTH_HOST
ARG VITE_DSCORE_PRODUCTION_BASE_HOST
ARG VITE_DSCORE_PRODUCTION_AUTH_HOST
ARG VITE_DSCORE_GLOBAL_HOST
ARG VITE_DSCORE_CALLBACK_URL

# 3Shape environment variables
ARG VITE_3SHAPE_CLIENT_ID
ARG VITE_3SHAPE_CLIENT_SECRET
ARG VITE_3SHAPE_API_URL
ARG VITE_3SHAPE_AUTH_URL
ARG VITE_3SHAPE_CALLBACK_URL

# Set environment variables for build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# DS-Core environment variables
ENV VITE_DSCORE_CLIENT_ID=$VITE_DSCORE_CLIENT_ID
ENV VITE_DSCORE_CLIENT_SECRET=$VITE_DSCORE_CLIENT_SECRET
ENV VITE_DSCORE_ENVIRONMENT=$VITE_DSCORE_ENVIRONMENT
ENV VITE_DSCORE_SANDBOX_BASE_HOST=$VITE_DSCORE_SANDBOX_BASE_HOST
ENV VITE_DSCORE_SANDBOX_AUTH_HOST=$VITE_DSCORE_SANDBOX_AUTH_HOST
ENV VITE_DSCORE_PRODUCTION_BASE_HOST=$VITE_DSCORE_PRODUCTION_BASE_HOST
ENV VITE_DSCORE_PRODUCTION_AUTH_HOST=$VITE_DSCORE_PRODUCTION_AUTH_HOST
ENV VITE_DSCORE_GLOBAL_HOST=$VITE_DSCORE_GLOBAL_HOST
ENV VITE_DSCORE_CALLBACK_URL=$VITE_DSCORE_CALLBACK_URL

# 3Shape environment variables
ENV VITE_3SHAPE_CLIENT_ID=$VITE_3SHAPE_CLIENT_ID
ENV VITE_3SHAPE_CLIENT_SECRET=$VITE_3SHAPE_CLIENT_SECRET
ENV VITE_3SHAPE_API_URL=$VITE_3SHAPE_API_URL
ENV VITE_3SHAPE_AUTH_URL=$VITE_3SHAPE_AUTH_URL
ENV VITE_3SHAPE_CALLBACK_URL=$VITE_3SHAPE_CALLBACK_URL

ENV NODE_ENV=production

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration for SPA with port 3000
RUN echo 'server { \
    listen 3000; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
