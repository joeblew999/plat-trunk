// auth-better/web/src/routes/account.tsx
// Route: /account/:pathname?
// AccountView handles auth protection, sidebar nav, settings/security/api-keys tabs.

import { AccountView } from '@daveyplate/better-auth-ui';
import { useParams } from 'react-router-dom';

export function AccountRoute() {
  const { pathname } = useParams();
  return (
    <div className="container mx-auto flex w-full grow flex-col p-4 md:p-6">
      <AccountView pathname={pathname} showTeams />
    </div>
  );
}
