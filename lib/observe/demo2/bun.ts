import { createStandardDemoWorker } from '../shared/worker'
const { app } = await createStandardDemoWorker('log-demo-2')
export default { port: 3334, fetch: app.fetch }
