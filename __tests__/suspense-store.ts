import { expect } from 'chai';
import { describe, it } from 'vitest';
import { SuspenseStore } from '../src';

const cacheKey = 'cache-key';

describe('SuspenseStore', () => {
  it('should create suspense id', () => {
    const suspenseStore = new SuspenseStore();
    const result = suspenseStore.createSuspenseId('root', cacheKey);
    const result2 = suspenseStore.createSuspenseId('root', cacheKey);
    const result3 = suspenseStore.createSuspenseId('second', cacheKey);

    expect(result).to.equal('root:a');
    expect(result2).to.equal('root:b');
    expect(result3).to.equal('second:a');
  });

  it('should create namespace id', () => {
    const suspenseStore = new SuspenseStore();
    const result = suspenseStore.createNamespaceId('a', cacheKey);
    const result2 = suspenseStore.createNamespaceId('b', cacheKey);
    const result3 = suspenseStore.createNamespaceId('a', cacheKey);
    const result4 = suspenseStore.createNamespaceId('a', cacheKey);

    expect(result).to.equal('a|a');
    expect(result3).to.equal('a|b');
    expect(result4).to.equal('a|c');
    expect(result2).to.equal('b|a');
  });

  it('should create id', () => {
    const suspenseStore = new SuspenseStore();
    const result = suspenseStore.createId('a', cacheKey);
    const result2 = suspenseStore.createId('a', cacheKey);
    const result3 = suspenseStore.createId('b', cacheKey);

    expect(result).to.equal('a-a');
    expect(result2).to.equal('a-b');
    expect(result3).to.equal('b-a');
  });

  it("should reset generated id's for suspense", () => {
    const suspenseStore = new SuspenseStore();
    const suspenseId = suspenseStore.createSuspenseId('root', cacheKey);

    const result1 = suspenseStore.createId(suspenseId, cacheKey);
    const result2 = suspenseStore.createId(suspenseId, cacheKey);

    suspenseStore.resetSuspense(suspenseId);

    const result3 = suspenseStore.createId(suspenseId, cacheKey);
    const result4 = suspenseStore.createId(suspenseId, cacheKey);

    expect(result1).to.equal('root:a-a');
    expect(result2).to.equal('root:a-b');
    expect(result3).to.equal('root:a-a');
    expect(result4).to.equal('root:a-b');
  });

  it("should reset generated id's for namespace", () => {
    const suspenseStore = new SuspenseStore();
    const namespaceId = suspenseStore.createNamespaceId('ns', cacheKey);

    const result1 = suspenseStore.createId(namespaceId, cacheKey, true);
    const result2 = suspenseStore.createId(namespaceId, cacheKey, true);

    suspenseStore.resetNamespace(namespaceId);

    const result3 = suspenseStore.createId(namespaceId, cacheKey);
    const result4 = suspenseStore.createId(namespaceId, cacheKey);

    expect(result1).to.equal('ns|a-a');
    expect(result2).to.equal('ns|a-b');
    expect(result3).to.equal('ns|a-a');
    expect(result4).to.equal('ns|a-b');
  });
});
