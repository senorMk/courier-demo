import { IConfiguration } from './env.configuration.interface';
import { ConfigFactory } from '@nestjs/config';

const configuration: ConfigFactory<IConfiguration> = () => ({
  databaseUrl: process.env.DATABASE_URL,
  port: parseInt(process.env.PORT),
  environment: {
    nodeEnvironment: process.env.NODE_ENV,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
  },
});

export default configuration;
