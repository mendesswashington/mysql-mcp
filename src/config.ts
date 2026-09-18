import { config as loadEnvironment } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadEnvironment({ path: resolve(projectRoot, '.env'), quiet: true });

const environmentSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_ALLOWED_SCHEMAS: z.string().min(1),
  DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(10).default(3),
  DB_QUERY_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  MCP_MAX_ROWS: z.coerce.number().int().min(1).max(1000).default(100),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const details = parsedEnvironment.error.issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Configuração inválida: ${details}`);
}

const environment = parsedEnvironment.data;
const allowedSchemas = environment.DB_ALLOWED_SCHEMAS
  .split(',')
  .map(schema => schema.trim())
  .filter(Boolean);

if (allowedSchemas.length === 0) {
  throw new Error('DB_ALLOWED_SCHEMAS precisa conter ao menos um schema.');
}

export const config = {
  database: {
    host: environment.DB_HOST,
    port: environment.DB_PORT,
    user: environment.DB_USER,
    password: environment.DB_PASSWORD,
    connectionLimit: environment.DB_CONNECTION_LIMIT,
    queryTimeoutMs: environment.DB_QUERY_TIMEOUT_MS,
    allowedSchemas,
  },
  mcp: {
    maxRows: environment.MCP_MAX_ROWS,
  },
} as const;
