# AppSupply MySQL MCP

Servidor MCP local e somente leitura para inspecionar schemas MySQL da AppSupply pelo Codex.

## Requisitos

- Node.js 20 ou superior
- Um usuário MySQL exclusivo com apenas `SELECT` e `SHOW VIEW`
- Acesso de rede ao servidor MySQL

## Configuração

```bash
cp .env.example .env
npm install
npm run build
```

Preencha o `.env` local. Nunca adicione esse arquivo ao Git.

## Executar

```bash
npm start
```

O transporte é `stdio`; portanto, a ausência de saída visível é normal. Logs não devem ser escritos em `stdout`, pois isso corrompe o protocolo MCP.

## Registrar no Codex

```bash
codex mcp add appsupply-mysql -- node /root/projects/appsupply-mysql-mcp/dist/server.js
```

Depois, confira:

```bash
codex mcp get appsupply-mysql
codex mcp list
```

## Ferramentas

- `list_allowed_schemas`
- `list_tables`
- `describe_table`
- `read_table_sample`

O servidor não oferece execução de SQL arbitrário. O acesso também deve ser limitado no próprio MySQL por um usuário somente leitura.
