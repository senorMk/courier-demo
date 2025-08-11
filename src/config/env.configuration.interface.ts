export interface IConfiguration {
  databaseUrl: string;
  port: number;
  environment: {
    nodeEnvironment: string;
  };
  redis: {
    host: string;
    port: number;
  };
}
