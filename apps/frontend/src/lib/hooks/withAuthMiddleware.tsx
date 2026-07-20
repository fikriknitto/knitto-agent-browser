import { useUserLogin } from './hooks';

export default function withAuthMiddleware<TProps extends object>(
  WrappedComponent: React.ComponentType<TProps>
) {
  return (props: TProps) => {
    const { authorized, unauthorized } = useUserLogin();
    const isLoginPage = window.location.pathname === '/login';

    if (isLoginPage && authorized) {
      window.location.href = '/';
      return null;
    }

    if (!isLoginPage && unauthorized) {
      window.location.href = '/login';
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
