import * as Joi from 'joi';

const production = Joi.object({
  DATABASE_URL: Joi.string().required(),
  PORT: Joi.number().default(4040),
  NODE_ENV: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
});

const development = Joi.object({
  DATABASE_URL: Joi.string().required(),
  PORT: Joi.number().default(4040),
  NODE_ENV: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
});

let environmentSchema: Joi.ObjectSchema<any>;

if (['development'].includes(process.env.NODE_ENV)) {
  environmentSchema = development;
} else {
  environmentSchema = production;
}

export default environmentSchema;
