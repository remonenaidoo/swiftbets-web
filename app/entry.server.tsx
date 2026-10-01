import { PassThrough } from 'node:stream';
import { createReadableStreamFromReadable } from '@react-router/node';
import { isbot } from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { type AppLoadContext, type EntryContext, ServerRouter } from 'react-router';
import './context';

const streamTimeout = 5_000;

// Every script the page needs carries the request's nonce; the CSP header from server.mjs allows nothing else.
export default function handleRequest(request: Request, status: number, headers: Headers, routerContext: EntryContext, loadContext: AppLoadContext) {
  const nonce = loadContext.nonce;
  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;
    const readyEvent = isbot(request.headers.get('user-agent') ?? '') || routerContext.isSpaMode ? 'onAllReady' : 'onShellReady';
    const { pipe, abort } = renderToPipeableStream(<ServerRouter context={routerContext} url={request.url} nonce={nonce} />, {
      nonce,
      [readyEvent]() {
        shellRendered = true;
        const body = new PassThrough();
        headers.set('Content-Type', 'text/html; charset=utf-8');
        resolve(new Response(createReadableStreamFromReadable(body), { headers, status }));
        pipe(body);
      },
      onShellError: reject,
      onError(error: unknown) {
        status = 500;
        if (shellRendered) console.error(error);
      },
    });
    setTimeout(abort, streamTimeout + 1_000);
  });
}
