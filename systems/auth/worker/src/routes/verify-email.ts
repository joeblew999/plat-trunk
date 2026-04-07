import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types';
import { layout } from '../views/layout';
import { verifyEmailPage } from '../views/verify-email';

const verifyEmail = new OpenAPIHono<AppEnv>();

verifyEmail.get('/auth/verify-email', (c) => {
  return c.html(layout('Verify Email — CAD', verifyEmailPage()));
});

export default verifyEmail;
