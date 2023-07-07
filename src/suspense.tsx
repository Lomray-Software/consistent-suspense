import type { FC, PropsWithChildren, SuspenseProps } from 'react';
import React, {
  useContext,
  Suspense as DefaultSuspense,
  useMemo,
  useId as useReactId,
  useState,
} from 'react';
import SuspenseStore from './suspense-store';

export interface IConsistentSuspense {
  suspenseId: string;
  parentId: string; // parent suspense id
  namespaceId: string | null;
  store: SuspenseStore;
}

export interface ISuspense extends SuspenseProps {
  ErrorBoundary?: FC<PropsWithChildren>;
}

type TConsistentSuspenseProvider = Partial<IConsistentSuspense>;

/**
 * Consistent suspense context
 */
const ConsistentSuspenseContext = React.createContext<IConsistentSuspense>({
  suspenseId: '',
  parentId: '',
  namespaceId: null,
  store: new SuspenseStore(),
});

/**
 * Consistent suspense provider
 * @constructor
 */
const ConsistentSuspenseProvider: FC<PropsWithChildren<TConsistentSuspenseProvider>> = ({
  children,
  parentId = '',
  suspenseId = '',
  namespaceId = null,
  store = new SuspenseStore(),
}) => {
  const value = useMemo(
    () => ({
      parentId,
      suspenseId,
      namespaceId,
      store,
    }),
    [suspenseId, store, parentId],
  );

  return <ConsistentSuspenseContext.Provider value={value} children={children} />;
};

/**
 * Get consistent suspense context
 */
const useConsistentSuspense = (): IConsistentSuspense => useContext(ConsistentSuspenseContext);

/**
 * Generate consistent id
 * prefix - e.g. use for libraries, it needed in hard cases when inside one suspense more than one promise
 */
const useId = (): string => {
  const { store, suspenseId, namespaceId } = useConsistentSuspense();
  const cacheKey = useReactId(); // stable between re-render on hydration

  return store.createId(namespaceId || suspenseId, cacheKey, Boolean(namespaceId));
};

/**
 * Reset generated id's each time when suspense try to create element
 * @constructor
 */
const SuspenseReset: FC<PropsWithChildren> = ({ children }) => {
  const { store, suspenseId, namespaceId } = useConsistentSuspense();

  useState(() => {
    if (namespaceId) {
      return store.resetNamespace(namespaceId);
    }

    return store.resetSuspense(suspenseId);
  });

  return <>{children}</>;
};

/**
 * Create separated namespace id's for children
 * @constructor
 */
const Namespace: FC<PropsWithChildren> = ({ children }) => {
  const { store, parentId, suspenseId, namespaceId } = useConsistentSuspense();
  const cacheKey = useReactId(); // stable between re-render on hydration
  const nextNamespaceId = store.createNamespaceId(namespaceId || suspenseId, cacheKey);

  return (
    <ConsistentSuspenseProvider
      store={store}
      parentId={parentId}
      suspenseId={suspenseId}
      namespaceId={nextNamespaceId}
    >
      <SuspenseReset>{children}</SuspenseReset>
    </ConsistentSuspenseProvider>
  );
};

/**
 * Wrap original suspense to provide consistent id's
 * @constructor
 */
const Suspense: FC<ISuspense> & { NS: typeof Namespace } = ({
  children,
  fallback,
  ErrorBoundary,
}) => {
  const { store, parentId } = useConsistentSuspense();
  const cacheKey = useReactId(); // stable between re-render on hydration
  const suspenseId = store.createSuspenseId(parentId, cacheKey);

  /**
   * Add suspense label
   */
  const fallbackWithId = (
    <>
      <script data-suspense-id={suspenseId} />
      {fallback}
    </>
  );
  const childrenWithReset = <SuspenseReset>{children}</SuspenseReset>;
  const SuspenseElement = (
    <ConsistentSuspenseProvider
      store={store}
      parentId={suspenseId}
      suspenseId={suspenseId}
      namespaceId={null}
    >
      <DefaultSuspense children={childrenWithReset} fallback={fallbackWithId} />
    </ConsistentSuspenseProvider>
  );

  return ErrorBoundary ? <ErrorBoundary>{SuspenseElement}</ErrorBoundary> : SuspenseElement;
};

Suspense.NS = Namespace;

export { Suspense, ConsistentSuspenseProvider, useConsistentSuspense, useId };
