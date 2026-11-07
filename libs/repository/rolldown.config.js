import { defineConfig } from 'rolldown'

export default defineConfig({
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: true,
  },
  external: [/^@vyrak\//, /^@nestjs\//, /node:.*/],
  platform: 'node',
})
