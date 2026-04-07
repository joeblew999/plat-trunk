import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types';
import { layout } from '../views/layout';
import { loginPage } from '../views/login';

const login = new OpenAPIHono<AppEnv>();

login.get('/auth/sign-in', (c) => {
  if (c.get('user')) return c.redirect('/auth/demo');
  return c.html(layout('Sign In — CAD', loginPage()));
});

login.get('/auth/sign-up', (c) => {
  if (c.get('user')) return c.redirect('/auth/demo');
  return c.html(layout('Sign Up — CAD', loginPage()));
});

login.get('/auth/login', (c) => {
  if (c.get('user')) return c.redirect('/auth/demo');
  return c.html(layout('Sign In — CAD', loginPage()));
});

export default login;
