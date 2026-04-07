import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types';
import { layout } from '../views/layout';
import { demoPage } from '../views/demo';

const demo = new OpenAPIHono<AppEnv>();

demo.get('/auth/demo', (c) => {
  const user = c.get('user');
  return c.html(layout('Demo — Permissions + Filesystem', demoPage(user)));
});

export default demo;
