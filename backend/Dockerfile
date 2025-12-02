FROM public.ecr.aws/docker/library/node:22 as build-stage

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22
WORKDIR /app
COPY --from=build-stage /app/node_modules ./node_modules
COPY --from=build-stage /app/prisma ./prisma
COPY --from=build-stage /app/scripts ./scripts
COPY --from=build-stage /app/package*.json ./
COPY --from=build-stage /app/dist ./dist
EXPOSE 3000
CMD ["npm", "run", "deploy", "--verbose"]