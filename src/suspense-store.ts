/**
 * Consistent suspense store
 */
class SuspenseStore {
  /**
   * Store suspense context information
   */
  protected namespaces: Map<
    string,
    {
      suspenseLetter: string;
      elementLetter: string;
      subNamespaces: Map<
        string,
        {
          namespaceLetter: string;
          elementLetter: string;
        }
      >;
    }
  > = new Map();

  /**
   * Cache generated id's
   */
  protected cache: Map<string, string> = new Map();

  /**
   * Cache keys grouped by the suspense that owns the generated id (element and
   * sub-namespace ids). Resets touch only their own group instead of the whole cache.
   */
  protected keysBySuspense: Map<string, Set<string>> = new Map();

  /**
   * Cache keys of element ids grouped by their namespace
   */
  protected keysByNamespace: Map<string, Set<string>> = new Map();

  /**
   * Detect server side
   */
  protected isServer = typeof window === 'undefined';

  /**
   * Get next letter
   */
  protected getNextLetter(str: string): string {
    const letters = str.split('');
    const letter = letters.pop() ?? '`'; // default char code is '`' and next is 'a'

    if (letter === 'z') {
      return [...letters, 'A'].join('');
    } else if (letter === 'Z') {
      const prevLetter = letters.pop();

      if (!prevLetter) {
        return 'aa';
      }

      return [this.getNextLetter([...letters, prevLetter].join('')), 'a'].join('');
    }

    return [...letters, String.fromCharCode(letter.charCodeAt(0) + 1)].join('');
  }

  /**
   * Make suspense id
   */
  protected makeSuspenseId(letter: string, parentId?: string, isSubNS = false) {
    if (isSubNS) {
      return `${parentId ?? ''}|${letter}`;
    }

    return parentId ? `${parentId}:${letter}` : `${letter}`;
  }

  /**
   * Make namespace or reset
   */
  protected makeNamespace(suspenseId: string): void {
    this.namespaces.set(suspenseId, {
      suspenseLetter: 'a',
      elementLetter: '',
      subNamespaces: new Map(),
    });
  }

  /**
   * Get suspense id by namespace
   */
  protected getSuspenseByNamespace(namespaceId: string): string {
    const separator = namespaceId.indexOf('|');

    return separator === -1 ? namespaceId : namespaceId.slice(0, separator);
  }

  /**
   * Remember which suspense and namespace can reset the cached id
   */
  protected indexCacheKey(key: string, id: string): void {
    const element = id.indexOf('-');
    const subNamespace = id.indexOf('|');
    const ownerEnd =
      element === -1
        ? subNamespace
        : subNamespace === -1
          ? element
          : Math.min(element, subNamespace);

    // bare suspense ids are never reset
    if (ownerEnd === -1) {
      return;
    }

    this.addCacheKey(this.keysBySuspense, id.slice(0, ownerEnd), key);

    if (element !== -1) {
      this.addCacheKey(this.keysByNamespace, id.slice(0, element), key);
    }
  }

  /**
   * Add cache key to the group
   */
  protected addCacheKey(groups: Map<string, Set<string>>, group: string, key: string): void {
    const keys = groups.get(group);

    if (keys) {
      keys.add(key);
    } else {
      groups.set(group, new Set<string>().add(key));
    }
  }

  /**
   * Drop cached ids of the group which still start with one of the prefixes
   */
  protected invalidateCacheGroup(
    groups: Map<string, Set<string>>,
    group: string,
    prefixes: string[],
  ): void {
    const keys = groups.get(group);

    if (!keys) {
      return;
    }

    groups.delete(group);

    for (const key of keys) {
      const id = this.cache.get(key);

      if (id !== undefined && prefixes.some((prefix) => id.startsWith(prefix))) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Cache generated id's
   */
  protected withCache(key: string, callback: () => string): string {
    // return from cache (strict mode fix)
    const cached = this.cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = callback();

    this.cache.set(key, result);
    this.indexCacheKey(key, result);

    return result;
  }

  /**
   * Generate suspense id
   */
  public createSuspenseId(parentId: string, cacheKey: string): string {
    return this.withCache(`suspense:${parentId}:${cacheKey}`, () => {
      let nextSuspenseId = this.makeSuspenseId('a', parentId);
      const currNamespace = this.namespaces.get(nextSuspenseId);

      if (currNamespace) {
        currNamespace.suspenseLetter = this.getNextLetter(currNamespace.suspenseLetter);
        nextSuspenseId = this.makeSuspenseId(currNamespace.suspenseLetter, parentId);
      }

      this.makeNamespace(nextSuspenseId);

      return nextSuspenseId;
    });
  }

  /**
   * Create new namespace for suspense
   */
  public createNamespaceId(namespaceId: string, cacheKey: string): string {
    return this.withCache(`namespace:${namespaceId}:${cacheKey}`, () => {
      const suspenseId = this.getSuspenseByNamespace(namespaceId);

      if (!this.namespaces.has(suspenseId)) {
        this.makeNamespace(suspenseId);
      }

      let nextNamespaceId = this.makeSuspenseId('a', namespaceId, true);
      const suspenseNamespaces = this.namespaces.get(suspenseId)!.subNamespaces;
      const currNamespace = suspenseNamespaces.get(nextNamespaceId);

      if (currNamespace) {
        currNamespace.namespaceLetter = this.getNextLetter(currNamespace.namespaceLetter);
        nextNamespaceId = this.makeSuspenseId(currNamespace.namespaceLetter, namespaceId, true);
      }

      suspenseNamespaces.set(nextNamespaceId, {
        namespaceLetter: 'a',
        elementLetter: '',
      });

      return nextNamespaceId;
    });
  }

  /**
   * Generate consistent id which doesn't change inside suspense
   */
  public createId(namespaceId: string, cacheKey: string, isNamespace = false): string {
    return this.withCache(`element:${namespaceId}:${cacheKey}`, () => {
      const suspenseId = this.getSuspenseByNamespace(namespaceId);

      if (!this.namespaces.has(suspenseId)) {
        this.makeNamespace(suspenseId);
      }

      const suspenseNamespace = this.namespaces.get(suspenseId)!;
      let currNamespace = isNamespace
        ? suspenseNamespace.subNamespaces.get(namespaceId)
        : suspenseNamespace;

      if (!currNamespace) {
        suspenseNamespace.subNamespaces.set(namespaceId, {
          namespaceLetter: 'a',
          elementLetter: '',
        });

        currNamespace = suspenseNamespace.subNamespaces.get(namespaceId);
      }

      currNamespace!.elementLetter = this.getNextLetter(currNamespace!.elementLetter);

      // new id
      return `${namespaceId}-${currNamespace!.elementLetter}`;
    });
  }

  /**
   * Reset all generated id's for current suspense
   */
  public resetSuspense(suspenseId: string): void {
    const currNamespace = this.namespaces.get(suspenseId);

    if (!currNamespace) {
      return;
    }

    // Invalidate the allocations whose counters are being reset. Keep the
    // sibling boundary counter: it also reserves IDs outside this suspense.
    this.invalidateCacheGroup(this.keysBySuspense, suspenseId, [
      `${suspenseId}-`,
      `${suspenseId}|`,
    ]);
    currNamespace.elementLetter = '';
    currNamespace.subNamespaces.clear();
  }

  /**
   * Reset all generated id's for current namespace
   */
  public resetNamespace(namespaceId: string): void {
    const suspenseId = this.getSuspenseByNamespace(namespaceId);
    const suspenseNamespace = this.namespaces.get(suspenseId);

    if (!suspenseNamespace) {
      return;
    }

    const currNamespace = suspenseNamespace.subNamespaces.get(namespaceId);

    if (!currNamespace) {
      return;
    }

    this.invalidateCacheGroup(this.keysByNamespace, namespaceId, [`${namespaceId}-`]);
    currNamespace.elementLetter = '';
  }
}

export default SuspenseStore;
