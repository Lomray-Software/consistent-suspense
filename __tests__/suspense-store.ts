import { describe, expect, it } from 'vitest';
import { SuspenseStore } from '../src';

describe('SuspenseStore', () => {
  it('reuses server allocations across repeated retries', () => {
    const store = new SuspenseStore();
    const suspenseId = store.createSuspenseId('', 'boundary');
    const namespaceId = store.createNamespaceId(suspenseId, 'namespace');

    for (let retry = 0; retry < 3; retry++) {
      expect(store.createSuspenseId('', 'boundary')).toBe(suspenseId);
      expect(store.createNamespaceId(suspenseId, 'namespace')).toBe(namespaceId);
      expect(store.createId(namespaceId, 'child', true)).toBe('a|a-a');
    }

    expect(store.createId(namespaceId, 'new-child', true)).toBe('a|a-b');
    expect(store.createNamespaceId(suspenseId, 'new-namespace')).toBe('a|b');
    expect(store.createSuspenseId('', 'new-boundary')).toBe('b');
  });

  it('keeps cache and counters consistent for new children after resets', () => {
    const store = new SuspenseStore();
    const suspenseId = store.createSuspenseId('', 'boundary');
    const namespaceId = store.createNamespaceId(suspenseId, 'namespace');

    store.createSuspenseId('', 'sibling');
    store.createNamespaceId(suspenseId, 'sibling-namespace');
    store.createId(namespaceId, 'old', true);
    store.resetNamespace(namespaceId);
    expect(store.createId(namespaceId, 'new', true)).toBe('a|a-a');
    expect(store.createId(namespaceId, 'old', true)).toBe('a|a-b');
    expect(store.createNamespaceId(suspenseId, 'third-namespace')).toBe('a|c');

    store.resetSuspense(suspenseId);
    expect(store.createId(suspenseId, 'child')).toBe('a-a');
    expect(store.createId(suspenseId, 'new-child')).toBe('a-b');
    expect(store.createNamespaceId(suspenseId, 'new-namespace')).toBe('a|a');
    expect(store.createNamespaceId(suspenseId, 'namespace')).toBe('a|b');
    expect(store.createId('a|b', 'old', true)).toBe('a|b-a');
    expect(store.createSuspenseId('', 'third-boundary')).toBe('c');
  });

  it('should create suspense id', () => {
    const suspenseStore = new SuspenseStore();
    const result = suspenseStore.createSuspenseId('root', 'hook-1');
    const result2 = suspenseStore.createSuspenseId('root', 'hook-2');
    const result3 = suspenseStore.createSuspenseId('second', 'hook-3');

    expect(result).toBe('root:a');
    expect(result2).toBe('root:b');
    expect(result3).toBe('second:a');
  });

  it('should create namespace id', () => {
    const suspenseStore = new SuspenseStore();
    const result = suspenseStore.createNamespaceId('a', 'hook-4');
    const result2 = suspenseStore.createNamespaceId('b', 'hook-5');
    const result3 = suspenseStore.createNamespaceId('a', 'hook-6');
    const result4 = suspenseStore.createNamespaceId('a', 'hook-7');

    expect(result).toBe('a|a');
    expect(result3).toBe('a|b');
    expect(result4).toBe('a|c');
    expect(result2).toBe('b|a');
  });

  it('should create id', () => {
    const suspenseStore = new SuspenseStore();
    const result = suspenseStore.createId('a', 'hook-8');
    const result2 = suspenseStore.createId('a', 'hook-9');
    const result3 = suspenseStore.createId('b', 'hook-10');

    expect(result).toBe('a-a');
    expect(result2).toBe('a-b');
    expect(result3).toBe('b-a');
  });

  it("should reset generated id's for suspense", () => {
    const suspenseStore = new SuspenseStore();
    const suspenseId = suspenseStore.createSuspenseId('root', 'hook-11');

    const result1 = suspenseStore.createId(suspenseId, 'hook-12');
    const result2 = suspenseStore.createId(suspenseId, 'hook-13');

    suspenseStore.resetSuspense(suspenseId);

    const result3 = suspenseStore.createId(suspenseId, 'hook-12');
    const result4 = suspenseStore.createId(suspenseId, 'hook-13');

    expect(result1).toBe('root:a-a');
    expect(result2).toBe('root:a-b');
    expect(result3).toBe('root:a-a');
    expect(result4).toBe('root:a-b');
  });

  it("should reset generated id's for namespace", () => {
    const suspenseStore = new SuspenseStore();
    const namespaceId = suspenseStore.createNamespaceId('ns', 'hook-16');

    const result1 = suspenseStore.createId(namespaceId, 'hook-17', true);
    const result2 = suspenseStore.createId(namespaceId, 'hook-18', true);

    suspenseStore.resetNamespace(namespaceId);

    const result3 = suspenseStore.createId(namespaceId, 'hook-19');
    const result4 = suspenseStore.createId(namespaceId, 'hook-20');

    expect(result1).toBe('ns|a-a');
    expect(result2).toBe('ns|a-b');
    expect(result3).toBe('ns|a-a');
    expect(result4).toBe('ns|a-b');
  });
  it('resets only the ids owned by the suspense or namespace', () => {
    const store = new SuspenseStore();
    const first = store.createSuspenseId('', 'first');
    const second = store.createSuspenseId('', 'second');
    const child = store.createSuspenseId(first, 'child');
    const namespace = store.createNamespaceId(first, 'namespace');

    store.createId(first, 'own');
    store.createId(second, 'other');
    store.createId(child, 'nested');
    store.createId(namespace, 'scoped', true);
    store.resetSuspense(first);

    // ids of other boundaries and of the nested boundary survive the reset
    expect(store.createId(second, 'other')).toBe('b-a');
    expect(store.createId(child, 'nested')).toBe('a:a-a');
    expect(store.createSuspenseId(first, 'child')).toBe(child);
    // own element ids and sub-namespaces start over
    expect(store.createId(first, 'own')).toBe('a-a');
    expect(store.createNamespaceId(first, 'namespace')).toBe(namespace);
    expect(store.createId(namespace, 'scoped', true)).toBe('a|a-a');

    // a cache key that moved to another namespace ignores the old namespace reset
    const other = store.createNamespaceId(second, 'other-namespace');

    store.createId(namespace, 'moved', true);
    store.resetNamespace(namespace);
    expect(store.createId(other, 'moved', true)).toBe('b|a-a');
    store.resetNamespace(namespace);
    expect(store.createId(other, 'moved', true)).toBe('b|a-a');
  });
});
