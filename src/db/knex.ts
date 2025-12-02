import knex from "knex";

import { config } from "../../config/config.js";

const pg_config = config.db_config.pg_main;


export const pg = knex({
  client: 'pg',
  connection: {
    host: pg_config.host,
    port: pg_config.port,
    user: pg_config.user,
    database: pg_config.database,
    password: pg_config.password,
    ssl: pg_config.ssl ? { rejectUnauthorized: false } : false,
  },
});


export const destroyDB = async (dbInstance: knex.Knex) => {
  await dbInstance.destroy();
};
