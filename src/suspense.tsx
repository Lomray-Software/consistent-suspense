import type { FC, PropsWithChildren, SuspenseProps } from 'react';
import React, {
  useContext,
  Suspense as DefaultSuspense,
  useMemo,
  useId as useReactId,
  Children,
} from 'react';
import SuspenseStore from './suspense-store';

export interface IConsistentSuspense {
  contextId: string;
  parentId: string;
  suspenseId: string;
  store: SuspenseStore;
}

type TConsistentSuspenseProvider = Partial<IConsistentSuspense>;

/**
 * Consistent suspense context
 */
const ConsistentSuspenseContext = React.createContext<IConsistentSuspense>({
  parentId: '',
  contextId: '',
  suspenseId: '',
  store: SuspenseStore.create(),
});

/**
 * Consistent suspense provider
 * @constructor
 */
const ConsistentSuspenseProvider: FC<PropsWithChildren<TConsistentSuspenseProvider>> = ({
  children,
  parentId = '',
  contextId = '',
  suspenseId = '',
  store = SuspenseStore.create(),
}) => {
  const value = useMemo(
    () => ({
      parentId,
      contextId,
      suspenseId,
      store,
    }),
    [contextId, store, parentId],
  );

  return <ConsistentSuspenseContext.Provider value={value} children={children} />;
};

/**
 * Get consistent suspense context
 */
const useConsistentSuspenseContext = (): IConsistentSuspense =>
  useContext(ConsistentSuspenseContext);

/**
 * Generate consistent id
 */
const useId = (): string => {
  const { store, contextId } = useConsistentSuspenseContext();
  const cacheKey = useReactId(); // stable between re-render

  return store.getId(contextId, cacheKey);
};

/**
 * Wrap original suspense to provide consistent id's
 * @constructor
 */
const Suspense: FC<SuspenseProps> = ({ children, fallback, ...props }) => {
  const id = useId();
  const { store, parentId } = useConsistentSuspenseContext();
  const cacheKey = useReactId(); // stable between re-render
  const contextId = store.getContextId(parentId, cacheKey);

  /**
   * Add lifebuoy
   */
  const fallbackWithId = store.hasLifebuoy ? (
    <>
      <script data-suspense-id={id} data-count={Children.count(children)} />
      {fallback}
    </>
  ) : (
    fallback
  );

  return (
    <ConsistentSuspenseProvider
      store={store}
      parentId={contextId}
      contextId={contextId}
      suspenseId={id}
    >
      <DefaultSuspense {...props} children={children} fallback={fallbackWithId} />;
    </ConsistentSuspenseProvider>
  );
};

export { Suspense, useId, ConsistentSuspenseProvider, useConsistentSuspenseContext };
