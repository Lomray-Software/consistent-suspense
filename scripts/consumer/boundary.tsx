import { Component, type PropsWithChildren } from 'react';
import { Suspense } from '@lomray/consistent-suspense';
class ErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>Error</p> : this.props.children; }
}
export const element = <Suspense ErrorBoundary={ErrorBoundary} fallback={null}><span>child</span></Suspense>;
