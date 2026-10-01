import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('account', 'routes/account.tsx'),
  route('account/register', 'routes/register.tsx'),
  route('account/verify', 'routes/verify.tsx'),
  route('account/sign-in', 'routes/sign-in.tsx'),
  route('account/forgot-password', 'routes/forgot-password.tsx'),
  route('account/reset-password', 'routes/reset-password.tsx'),
  route('account/sign-out', 'routes/sign-out.tsx'),
  route('account/safer-gambling', 'routes/safer-gambling.tsx'),
] satisfies RouteConfig;
