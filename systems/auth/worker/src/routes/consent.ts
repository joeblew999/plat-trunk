import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types';
import { layout } from '../views/layout';
import { consentPage } from '../views/consent';

const consent = new OpenAPIHono<AppEnv>();

consent.get('/auth/consent', (c) => {
  return c.html(layout('Authorize — CAD', consentPage()));
});

export default consent;
