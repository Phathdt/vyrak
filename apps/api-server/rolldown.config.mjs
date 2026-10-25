import { createAppConfig } from '../../config/rolldown.base.mjs'

export default createAppConfig({
  input: {
    main: 'src/main.ts',
    'generate-openapi': 'src/generate-openapi.ts',
  },
  appName: 'api-server',
})
