# Dependencies are installed in their own stage and copied in *after* the
# source, so the build context can never overwrite the Linux-native install.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules

ARG VITE_HOSTED=false
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_HOSTED=$VITE_HOSTED \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3541

# Mount your config.json at /usr/share/nginx/html/config.json
