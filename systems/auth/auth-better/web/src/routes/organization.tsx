// auth-better/web/src/routes/organization.tsx
// Route: /organization/:pathname?
// OrganizationView handles: settings, members, invitations, teams.
// useAuthenticate() inside — auto-redirects to sign-in if not signed in.

import { OrganizationView } from '@daveyplate/better-auth-ui';
import { useParams } from 'react-router-dom';

export function OrganizationRoute() {
  const { pathname } = useParams();
  return (
    <div className="container mx-auto flex w-full grow flex-col p-4 md:p-6">
      <OrganizationView pathname={pathname} />
    </div>
  );
}
