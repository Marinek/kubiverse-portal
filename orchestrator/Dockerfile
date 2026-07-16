FROM node:24-alpine AS build
WORKDIR /app

# Copy root workspace config
COPY package*.json ./
COPY portal/package*.json ./portal/
COPY shared/package*.json ./shared/
COPY orchestrator/package*.json ./orchestrator/

# Install dependencies (requires all workspace package.json files to run npm ci at root)
RUN npm ci

# Copy the rest of the files
COPY . .

# Build the shared library first, then orchestrator
RUN cd shared && npm run build
RUN cd orchestrator && npm run build

FROM node:24-alpine
RUN apk add --no-cache git
WORKDIR /app
COPY --from=build /app /app
WORKDIR /app/orchestrator
EXPOSE 3001
CMD ["npm", "start"]
