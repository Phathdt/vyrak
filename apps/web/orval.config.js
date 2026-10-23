module.exports = {
  vyrak: {
    input: {
      target: '../api-server/openapi.yml',
    },
    output: {
      target: './src/api/generated/api.ts',
      schemas: './src/api/generated/models',
      mode: 'tags-split',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: './src/api/client.ts',
          name: 'customInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'yarn prettier --write',
    },
  },
}
