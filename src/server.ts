import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { config } from './config.js';
import { closeDatabase, database } from './database.js';
import { assertAllowedSchema, assertSafeIdentifier } from './schema-access.js';

const server = new McpServer({
  name: 'appsupply-mysql',
  version: '1.0.0',
});

function textResult(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  };
}

server.registerTool(
  'list_allowed_schemas',
  {
    title: 'Listar schemas autorizados',
    description: 'Lista somente os schemas MySQL autorizados na configuração do MCP.',
    inputSchema: {},
  },
  async () => textResult(config.database.allowedSchemas),
);

server.registerTool(
  'list_tables',
  {
    title: 'Listar tabelas',
    description: 'Lista tabelas e views de um schema MySQL autorizado.',
    inputSchema: {
      schema: z.string().min(1),
    },
  },
  async ({ schema }) => {
    assertAllowedSchema(schema);

    const [rows] = await database.execute(
      {
        sql: `
          SELECT
            TABLE_NAME AS tableName,
            TABLE_TYPE AS tableType
          FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ?
          ORDER BY TABLE_NAME
        `,
        timeout: config.database.queryTimeoutMs,
      },
      [schema],
    );

    return textResult(rows);
  },
);

server.registerTool(
  'describe_table',
  {
    title: 'Descrever tabela',
    description: 'Retorna colunas, tipos e chaves de uma tabela em um schema autorizado.',
    inputSchema: {
      schema: z.string().min(1),
      table: z.string().min(1),
    },
  },
  async ({ schema, table }) => {
    assertAllowedSchema(schema);
    assertSafeIdentifier(table, 'Nome da tabela');

    const [rows] = await database.execute(
      {
        sql: `
          SELECT
            COLUMN_NAME AS columnName,
            COLUMN_TYPE AS columnType,
            IS_NULLABLE AS nullable,
            COLUMN_KEY AS columnKey,
            COLUMN_DEFAULT AS defaultValue,
            EXTRA AS extra
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `,
        timeout: config.database.queryTimeoutMs,
      },
      [schema, table],
    );

    return textResult(rows);
  },
);

server.registerTool(
  'read_table_sample',
  {
    title: 'Ler amostra da tabela',
    description: 'Lê uma amostra limitada de registros de uma tabela autorizada, sem permitir SQL livre.',
    inputSchema: {
      schema: z.string().min(1),
      table: z.string().min(1),
      limit: z.number().int().positive().optional(),
    },
  },
  async ({ schema, table, limit }) => {
    assertAllowedSchema(schema);
    assertSafeIdentifier(table, 'Nome da tabela');

    const rowLimit = Math.min(limit ?? 20, config.mcp.maxRows);
    const [tableRows] = await database.execute(
      `
        SELECT COUNT(*) AS tableCount
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
      `,
      [schema, table],
    );

    const exists = Array.isArray(tableRows)
      && tableRows.some(row => Number((row as { tableCount?: unknown }).tableCount) > 0);

    if (!exists) {
      throw new Error(`A tabela '${schema}.${table}' não existe.`);
    }

    const qualifiedTable = `${database.escapeId(schema)}.${database.escapeId(table)}`;
    const [rows] = await database.query({
      sql: `SELECT * FROM ${qualifiedTable} LIMIT ${rowLimit}`,
      timeout: config.database.queryTimeoutMs,
    });

    return textResult(rows);
  },
);

async function shutdown(): Promise<void> {
  await server.close();
  await closeDatabase();
}

process.once('SIGINT', () => {
  void shutdown().finally(() => process.exit(0));
});

process.once('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0));
});

const transport = new StdioServerTransport();
await server.connect(transport);
