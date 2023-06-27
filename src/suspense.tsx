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
  store: SuspenseStore;
}

type TConsistentSuspenseProvider = Partial<IConsistentSuspense>;

/**
 * Consistent suspense context
 */
const ConsistentSuspenseContext = React.createContext<IConsistentSuspense>({
  suspenseId: '',
  parentId: '',
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
  store = new SuspenseStore(),
}) => {
  const value = useMemo(
    () => ({
      parentId,
      suspenseId,
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
 */
const useId = (): string => {
  const { store, suspenseId } = useConsistentSuspense();
  const cacheKey = useReactId(); // stable between re-render on hydration

  return store.getId(suspenseId, cacheKey);
};

/**
 * Reset generated id's each time when suspense try to create element
 * @constructor
 */
const SuspenseControl: FC<PropsWithChildren> = ({ children }) => {
  const { suspenseId, store } = useConsistentSuspense();

  useState(() => store.resetSuspense(suspenseId));

  return <>{children}</>;
};

/**
 * Wrap original suspense to provide consistent id's
 * @constructor
 */
const Suspense: FC<SuspenseProps> = ({ children, fallback }) => {
  const { store, parentId } = useConsistentSuspense();
  const cacheKey = useReactId(); // stable between re-render on hydration
  const suspenseId = store.getSuspenseId(parentId, cacheKey);

  /**
   * Add suspense label
   */
  const fallbackWithId = (
    <>
      <script data-suspense-id={suspenseId} />
      {fallback}
    </>
  );
  const childrenUnderControl = <SuspenseControl>{children}</SuspenseControl>;

  return (
    <ConsistentSuspenseProvider store={store} parentId={suspenseId} suspenseId={suspenseId}>
      <DefaultSuspense children={childrenUnderControl} fallback={fallbackWithId} />
    </ConsistentSuspenseProvider>
  );
};

export { Suspense, ConsistentSuspenseProvider, useConsistentSuspense, useId };
