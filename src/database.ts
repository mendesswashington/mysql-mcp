import { createPool } from 'mysql2/promise';
import { config } from './config.js';

export const database = createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  waitForConnections: true,
  connectionLimit: config.database.connectionLimit,
  queueLimit: 0,
  enableKeepAlive: true,
  multipleStatements: false,
});

export async function closeDatabase(): Promise<void> {
  await database.end();
}
