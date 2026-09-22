# A suspension that knows where it is

![npm](https://img.shields.io/npm/v/@lomray/consistent-suspense)
![GitHub](https://img.shields.io/github/license/Lomray-Software/consistent-suspense)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=consistent-suspense&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=consistent-suspense)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=consistent-suspense&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=consistent-suspense)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=consistent-suspense&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=consistent-suspense)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=consistent-suspense&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=consistent-suspense)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=consistent-suspense&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=consistent-suspense)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=consistent-suspense&metric=coverage)](https://sonarcloud.io/summary/new_code?id=consistent-suspense)

This package associates generated IDs and streamed HTML with React Suspense
boundaries. It is intended for libraries that coordinate boundary-scoped state
during streaming SSR. It is not a data-fetching library or a general replacement
for React's `useId`. See the [original motivating issue](https://github.com/facebook/react/issues/24669)
for the retry behavior that prompted it.

The peer range starts at React and React DOM 18. That range does not establish
compatibility with every future streaming HTML format. The minimal example below
is checked with release 2.0.9 and React/React DOM 18.3.1.

## Getting started

The package is distributed using [npm](https://www.npmjs.com/), the node package manager.

```
npm i --save @lomray/consistent-suspense
```

## How to use

Use the provider and Suspense boundary from this package together. For SSR, render
a fresh provider for each request. If you supply its optional `store` prop, create
a new `SuspenseStore` for each request, never one shared across requests.

<!-- docs-test:example -->
```tsx
import React from 'react';
import { ConsistentSuspenseProvider, Suspense, useId } from '@lomray/consistent-suspense';

const Field = () => {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>Name</label>
      <input id={id} />
    </>
  );
};

export const App = () => (
  <ConsistentSuspenseProvider>
    <Suspense fallback={<p>Loading...</p>}>
      <Field />
    </Suspense>
  </ConsistentSuspenseProvider>
);
```

This field does not suspend; it demonstrates the provider and ID wiring. When a
boundary has several independently suspending children, wrap each in
`<Suspense.NS>...</Suspense.NS>` to give it a separate namespace. Keep the server
and client component structure consistent; IDs do not repair hydration mismatches.

## Analyze suspense html chunks (streaming)

The server entry point is `@lomray/consistent-suspense/server`. This integration
sketch assumes your application supplies `app`, `App` and its error handling.
Create the analyzer inside the request handler. The callback may insert HTML;
never interpolate untrusted state directly into a script. Use an audited serializer
and your application's CSP strategy if you add state transfer.

```typescript jsx
import { Transform } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import { renderToPipeableStream } from 'react-dom/server';
import { StreamSuspense } from '@lomray/consistent-suspense/server';

app.use('*', (req, res, next) => {
    const suspenseStream = StreamSuspense.create((suspenseId) => {
      // Observe completion without inserting application data into HTML.
      console.log('Completed Suspense boundary:', suspenseId);
      return '';
    });
    const decoder = new StringDecoder('utf8');
    const responseTransform = new Transform({
      transform(data, encoding, done) {
        // Decode bytes incrementally, including characters split between writes.
        const html = decoder.write(data);
        const rewrittenHtml = suspenseStream.analyze(html);

        // An empty string means the parser is waiting for the rest of a token.
        done(null, rewrittenHtml ?? html);
      },
      flush(done) {
        const html = decoder.end();
        const rewrittenHtml = suspenseStream.analyze(html);

        done(null, (rewrittenHtml ?? html) + suspenseStream.end());
      },
    });

    responseTransform.on('error', next);
    responseTransform.pipe(res);

    const stream = renderToPipeableStream(<App />, {
      onShellReady() {
        stream.pipe(responseTransform);
      },
      onShellError: next,
    });
});
```
Investigate [demo app](https://github.com/Lomray-Software/vite-template) to more understand how it works.

## Bugs and feature requests

Bug or a feature request, [please open a new issue](https://github.com/Lomray-Software/consistent-suspense/issues/new).

## License
Made with 💚

Published under [MIT License](./LICENSE).
