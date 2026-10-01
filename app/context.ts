import 'react-router';

declare module 'react-router' {
  interface AppLoadContext {
    nonce: string;
    gatewayUrl: string;
  }
}

export {};
