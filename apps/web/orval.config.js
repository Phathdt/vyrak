module.exports = {
  vyrak: {
    input: {
      target: '../../openapi.yaml',
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
      afterAllFilesWrite: 'prettier --write "./src/api/generated/**/*.ts"',
    },
  },
}
