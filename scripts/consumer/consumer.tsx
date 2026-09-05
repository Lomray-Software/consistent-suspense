import { Suspense, ConsistentSuspenseProvider, SuspenseStore, useId, useConsistentSuspense } from '@lomray/consistent-suspense';
import type { IConsistentSuspense, ISuspense } from '@lomray/consistent-suspense';
import { StreamSuspense } from '@lomray/consistent-suspense/server';
const stream: StreamSuspense = StreamSuspense.create((id, error) => `${id}:${error ?? ''}`);
stream.analyze('');
const store = new SuspenseStore();
const props: ISuspense = { fallback: null };
function Child() { const context: IConsistentSuspense = useConsistentSuspense(); return <span id={useId()}>{context.suspenseId}</span>; }
export const app = <ConsistentSuspenseProvider store={store}><Suspense {...props}><Suspense.NS><Child /></Suspense.NS></Suspense></ConsistentSuspenseProvider>;
