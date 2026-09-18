import { config } from './config.js';

const identifierPattern = /^[A-Za-z0-9_$]+$/;

export function assertAllowedSchema(schema: string): void {
  if (!config.database.allowedSchemas.includes(schema)) {
    throw new Error(`O schema '${schema}' não está autorizado.`);
  }
}

export function assertSafeIdentifier(identifier: string, label: string): void {
  if (!identifierPattern.test(identifier)) {
    throw new Error(`${label} inválido.`);
  }
}
