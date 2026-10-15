FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node server ./server
COPY --chown=node:node public ./public
RUN mkdir /app/data && chown node:node /app/data
USER node
ENV HOST=0.0.0.0 PORT=8080 DATABASE_PATH=/app/data/game.sqlite
VOLUME ["/app/data"]
EXPOSE 8080
CMD ["node", "server.mjs"]
