import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types';
import { layout } from '../views/layout';
import { resetPasswordPage } from '../views/reset-password';

const resetPassword = new OpenAPIHono<AppEnv>();

resetPassword.get('/auth/reset-password', (c) => {
  return c.html(layout('Reset Password — CAD', resetPasswordPage()));
});

export default resetPassword;
