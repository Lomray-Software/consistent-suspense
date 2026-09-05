import type { PropsWithChildren } from 'react';
import React, { Component } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ConsistentSuspenseProvider, Suspense } from '../src';

class ErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <p>Error</p> : this.props.children;
  }
}

it('accepts a class error boundary without a cast or wrapper', () => {
  const html = renderToString(
    <ConsistentSuspenseProvider>
      <Suspense ErrorBoundary={ErrorBoundary} fallback={null}>
        <span>child</span>
      </Suspense>
    </ConsistentSuspenseProvider>,
  );

  expect(html).toContain('<span>child</span>');
});
