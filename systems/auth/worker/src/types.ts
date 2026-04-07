import type { CloudflareBindings } from './auth';

export type Bindings = CloudflareBindings & {
  FILES: R2Bucket;
};

export type Variables = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role?: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  } | null;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
