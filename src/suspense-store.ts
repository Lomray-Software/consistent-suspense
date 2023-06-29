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
    return namespaceId.split('|')[0];
  }

  /**
   * Cache generated id's
   */
  protected withCache(key: string, callback: () => string): string {
    // return from cache (strict mode fix)
    if (this.cache.has(key) && !this.isServer) {
      return this.cache.get(key)!;
    }

    const result = callback();

    if (!this.isServer) {
      this.cache.set(key, result);
    }

    return result;
  }

  /**
   * Generate suspense id
   */
  public createSuspenseId(parentId: string, cacheKey: string): string {
    return this.withCache(cacheKey, () => {
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
    return this.withCache(cacheKey, () => {
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
    return this.withCache(cacheKey, () => {
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

    this.makeNamespace(suspenseId);
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

    suspenseNamespace.subNamespaces.set(namespaceId, {
      namespaceLetter: 'a',
      elementLetter: '',
    });
  }
}

export default SuspenseStore;
