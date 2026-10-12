# GunsNPrices MCP server (stdio). Build: docker build -t gunsnprices-mcp .  Run: docker run -i --rm gunsnprices-mcp
FROM node:22-alpine
LABEL io.modelcontextprotocol.server.name="io.github.gunsnprices/gunsnprices-mcp"
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
USER node
ENTRYPOINT ["node", "src/index.js"]
