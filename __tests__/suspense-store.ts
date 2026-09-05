import { expect } from 'chai';
import { describe, it } from 'vitest';
import { SuspenseStore } from '../src';

describe('SuspenseStore', () => {
  it('reuses server allocations across repeated retries', () => {
    const store = new SuspenseStore();
    const suspenseId = store.createSuspenseId('', 'boundary');
    const namespaceId = store.createNamespaceId(suspenseId, 'namespace');

    for (let retry = 0; retry < 3; retry++) {
      expect(store.createSuspenseId('', 'boundary')).to.equal(suspenseId);
      expect(store.createNamespaceId(suspenseId, 'namespace')).to.equal(namespaceId);
      expect(store.createId(namespaceId, 'child', true)).to.equal('a|a-a');
    }

    expect(store.createId(namespaceId, 'new-child', true)).to.equal('a|a-b');
    expect(store.createNamespaceId(suspenseId, 'new-namespace')).to.equal('a|b');
    expect(store.createSuspenseId('', 'new-boundary')).to.equal('b');
  });

  it('keeps cache and counters consistent for new children after resets', () => {
    const store = new SuspenseStore();
    const suspenseId = store.createSuspenseId('', 'boundary');
    const namespaceId = store.createNamespaceId(suspenseId, 'namespace');

    store.createSuspenseId('', 'sibling');
    store.createNamespaceId(suspenseId, 'sibling-namespace');
    store.createId(namespaceId, 'old', true);
    store.resetNamespace(namespaceId);
    expect(store.createId(namespaceId, 'new', true)).to.equal('a|a-a');
    expect(store.createId(namespaceId, 'old', true)).to.equal('a|a-b');
    expect(store.createNamespaceId(suspenseId, 'third-namespace')).to.equal('a|c');

    store.resetSuspense(suspenseId);
    expect(store.createId(suspenseId, 'child')).to.equal('a-a');
    expect(store.createId(suspenseId, 'new-child')).to.equal('a-b');
    expect(store.createNamespaceId(suspenseId, 'new-namespace')).to.equal('a|a');
    expect(store.createNamespaceId(suspenseId, 'namespace')).to.equal('a|b');
    expect(store.createId('a|b', 'old', true)).to.equal('a|b-a');
    expect(store.createSuspenseId('', 'third-boundary')).to.equal('c');
  });

  it('should create suspense id', () => {
    const suspenseStore = new SuspenseStore();
    const result = suspenseStore.createSuspenseId('root', 'hook-1');
    const result2 = suspenseStore.createSuspenseId('root', 'hook-2');
    const result3 = suspenseStore.createSuspenseId('second', 'hook-3');

    expect(result).to.equal('root:a');
    expect(result2).to.equal('root:b');
    expect(result3).to.equal('second:a');
  });

  it('should create namespace id', () => {
    const suspenseStore = new SuspenseStore();
    const result = suspenseStore.createNamespaceId('a', 'hook-4');
    const result2 = suspenseStore.createNamespaceId('b', 'hook-5');
    const result3 = suspenseStore.createNamespaceId('a', 'hook-6');
    const result4 = suspenseStore.createNamespaceId('a', 'hook-7');

    expect(result).to.equal('a|a');
    expect(result3).to.equal('a|b');
    expect(result4).to.equal('a|c');
    expect(result2).to.equal('b|a');
  });

  it('should create id', () => {
    const suspenseStore = new SuspenseStore();
    const result = suspenseStore.createId('a', 'hook-8');
    const result2 = suspenseStore.createId('a', 'hook-9');
    const result3 = suspenseStore.createId('b', 'hook-10');

    expect(result).to.equal('a-a');
    expect(result2).to.equal('a-b');
    expect(result3).to.equal('b-a');
  });

  it("should reset generated id's for suspense", () => {
    const suspenseStore = new SuspenseStore();
    const suspenseId = suspenseStore.createSuspenseId('root', 'hook-11');

    const result1 = suspenseStore.createId(suspenseId, 'hook-12');
    const result2 = suspenseStore.createId(suspenseId, 'hook-13');

    suspenseStore.resetSuspense(suspenseId);

    const result3 = suspenseStore.createId(suspenseId, 'hook-12');
    const result4 = suspenseStore.createId(suspenseId, 'hook-13');

    expect(result1).to.equal('root:a-a');
    expect(result2).to.equal('root:a-b');
    expect(result3).to.equal('root:a-a');
    expect(result4).to.equal('root:a-b');
  });

  it("should reset generated id's for namespace", () => {
    const suspenseStore = new SuspenseStore();
    const namespaceId = suspenseStore.createNamespaceId('ns', 'hook-16');

    const result1 = suspenseStore.createId(namespaceId, 'hook-17', true);
    const result2 = suspenseStore.createId(namespaceId, 'hook-18', true);

    suspenseStore.resetNamespace(namespaceId);

    const result3 = suspenseStore.createId(namespaceId, 'hook-19');
    const result4 = suspenseStore.createId(namespaceId, 'hook-20');

    expect(result1).to.equal('ns|a-a');
    expect(result2).to.equal('ns|a-b');
    expect(result3).to.equal('ns|a-a');
    expect(result4).to.equal('ns|a-b');
  });
});
