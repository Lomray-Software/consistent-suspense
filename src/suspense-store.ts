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
      startLetter: string;
      subNamespaces: Map<
        string,
        {
          namespaceLetter: string;
          elementLetter: string;
          startLetter: string;
        }
      >;
    }
  > = new Map();

  /**
   * Cache generated id's
   */
  protected cache: Map<string, string> = new Map();

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
  protected makeNamespace(suspenseId: string, startLetter: string): void {
    this.namespaces.set(suspenseId, {
      suspenseLetter: startLetter,
      elementLetter: '',
      startLetter,
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
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const result = callback();

    this.cache.set(key, result);

    return result;
  }

  /**
   * Generate suspense id
   */
  public createSuspenseId(parentId: string, cacheKey: string): string {
    return this.withCache(cacheKey, () => {
      let nextSuspenseId = this.makeSuspenseId('a', parentId);
      const currNamespace = this.namespaces.get(nextSuspenseId);
      const startLetter = currNamespace ? '' : 'a';

      if (currNamespace) {
        currNamespace.suspenseLetter = this.getNextLetter(currNamespace.suspenseLetter);
        nextSuspenseId = this.makeSuspenseId(currNamespace.suspenseLetter, parentId);
      }

      this.makeNamespace(nextSuspenseId, startLetter);

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
        this.makeNamespace(suspenseId, 'a');
      }

      let nextNamespaceId = this.makeSuspenseId('a', namespaceId, true);
      const suspenseNamespaces = this.namespaces.get(suspenseId)!.subNamespaces;
      const currNamespace = suspenseNamespaces.get(nextNamespaceId);
      const startLetter = currNamespace ? '' : 'a';

      if (currNamespace) {
        currNamespace.namespaceLetter = this.getNextLetter(currNamespace.namespaceLetter);
        nextNamespaceId = this.makeSuspenseId(currNamespace.namespaceLetter, namespaceId, true);
      }

      suspenseNamespaces.set(nextNamespaceId, {
        namespaceLetter: startLetter,
        elementLetter: '',
        startLetter,
      });

      return nextNamespaceId;
    });
  }

  /**
   * Generate consistent id which doesn't change inside suspense
   */
  public createId(namespaceId: string, cacheKey: string): string {
    return this.withCache(cacheKey, () => {
      const suspenseId = this.getSuspenseByNamespace(namespaceId);

      if (!this.namespaces.has(suspenseId)) {
        this.makeNamespace('', 'a');
      }

      const isNamespace = namespaceId !== suspenseId;
      const suspenseNamespace = this.namespaces.get(suspenseId)!;
      const currNamespace = isNamespace
        ? suspenseNamespace.subNamespaces.get(namespaceId)
        : suspenseNamespace;

      if (!currNamespace) {
        suspenseNamespace.subNamespaces.set(namespaceId, {
          namespaceLetter: 'a',
          elementLetter: '',
          startLetter: '',
        });
      }

      currNamespace!.elementLetter = this.getNextLetter(currNamespace!.elementLetter);

      this.cache.set(cacheKey, `${namespaceId}-${currNamespace!.elementLetter}`); // new id

      return this.cache.get(cacheKey)!;
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

    const { startLetter } = currNamespace;

    this.makeNamespace(suspenseId, startLetter);
  }
}

export default SuspenseStore;
