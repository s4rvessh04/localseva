import configJson from "./config.json" with {type: "json"}

type Config = {
  app_config: {
    "port": number,
    "identifier": string
    "code": string
    "api_prefix": string
  },
  cors_config: {
    "allowed_origins": string[],
    "max_age": number,
    "credentials": boolean,
    "allowed_method": string[]
  },
  db_config: {
    "pg_main": {
      "host": string,
      "port": number,
      "user": string,
      "password": string,
      "database": string,
      "ssl": boolean
    }
  }
}

// Freeze the config object to avoid accidental mutation
function deepFreeze<T>(obj: T): T {
  Object.getOwnPropertyNames(obj).forEach((name) => {
    const prop: any = (obj as any)[name];
    if (prop && typeof prop === 'object' && !Object.isFrozen(prop)) deepFreeze(prop);
  });
  return Object.freeze(obj);
}

export const config = deepFreeze(configJson);
export type { Config };
