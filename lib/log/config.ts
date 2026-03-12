/**
 * Shared log config builder — derives CF dashboard URLs from cf-deploy.json.
 *
 * Usage by any system:
 *   import { buildLogConfig } from '../../lib/log/config'
 *   const logRoutes = createLogRoutes(buildLogConfig('truck-cad'))
 *
 * Or with custom production URL:
 *   buildLogConfig('truck-cad', 'https://cad.ubuntusoftware.net')
 */

import cfDeploy from '../../cf-deploy.json'

export interface LogRoutesConfig {
  workerName?: string
  accountId?: string
  productionUrl?: string
}

/** Platform-level CF account ID — single source of truth from cf-deploy.json */
export const CF_ACCOUNT_ID: string = cfDeploy.account

/** Default workers domain from cf-deploy.json (first worker's domain) */
const CF_DOMAIN: string = (Object.values(cfDeploy.workers)[0] as { domain: string }).domain

/**
 * Build a LogRoutesConfig for any worker.
 *
 * @param workerName - CF worker name (e.g. 'truck-cad', 'log-demo')
 * @param productionUrl - Override production URL (auto-derived as https://{workerName}.{domain} if omitted)
 */
export function buildLogConfig(workerName: string, productionUrl?: string): Required<LogRoutesConfig> {
  return {
    workerName,
    accountId: CF_ACCOUNT_ID,
    productionUrl: productionUrl ?? `https://${workerName}.${CF_DOMAIN}`,
  }
}
