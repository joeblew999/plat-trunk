import { createStandardDemoWorker } from '../shared/worker'
const { app } = await createStandardDemoWorker('log-demo')
export default { port: 3333, fetch: app.fetch }
