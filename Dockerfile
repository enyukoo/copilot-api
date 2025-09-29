FROM node:20-alpine AS builder
WORKDIR /app

COPY ./package.json ./
RUN npm install --ignore-scripts

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY ./package.json ./
RUN npm install --omit=dev --production --ignore-scripts

COPY --from=builder /app/dist ./dist

EXPOSE 4141

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:4141/ || exit 1

ARG GH_TOKEN
ENV GH_TOKEN=$GH_TOKEN

ENTRYPOINT ["node", "dist/main.js"]
CMD ["start", "-g", "$GH_TOKEN"]
