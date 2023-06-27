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
    }
  > = new Map();

  /**
   * Cache suspense id's
   */
  protected cacheSuspense: Map<string, string> = new Map();

  /**
   * Cache generated id's
   */
  protected cacheId: Map<string, string> = new Map();

  /**
   * Get next letter
   */
  protected getNextLetter(str: string): string {
    const letters = str.split('');
    const letter = letters.pop() ?? 'a';

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
   * Get next context id
   */
  protected getNextSuspenseId(num: number | string, parentId?: string) {
    return parentId ? `${parentId}:${num}` : `${num}`;
  }

  /**
   * Generate suspense id
   */
  public getSuspenseId(parentId: string, cacheKey: string): string {
    // return id from cache (strict mode fix)
    if (this.cacheSuspense.has(cacheKey)) {
      return this.cacheSuspense.get(cacheKey)!;
    }

    let nextSuspenseId = this.getNextSuspenseId('a', parentId);
    const currNamespace = this.namespaces.get(nextSuspenseId);
    const startLetter = currNamespace ? '' : 'a';

    if (currNamespace) {
      currNamespace.suspenseLetter = this.getNextLetter(currNamespace.suspenseLetter);
      nextSuspenseId = this.getNextSuspenseId(currNamespace.suspenseLetter);
    }

    this.namespaces.set(nextSuspenseId, {
      suspenseLetter: startLetter,
      elementLetter: '',
      startLetter,
    });
    this.cacheSuspense.set(cacheKey, nextSuspenseId);

    return nextSuspenseId;
  }

  /**
   * Generate consistent id which doesn't change inside suspense
   */
  public getId(contextId: string, cacheKey: string): string {
    // return id from cache (strict mode fix)
    if (this.cacheId.has(cacheKey)) {
      return this.cacheId.get(cacheKey)!;
    }

    const contextNamespace = this.namespaces.get(contextId);

    // for root context
    if (!contextNamespace) {
      this.cacheId.set(cacheKey, cacheKey);

      return cacheKey;
    }

    contextNamespace.elementLetter = this.getNextLetter(contextNamespace.elementLetter);

    this.cacheId.set(cacheKey, `${contextId}-${contextNamespace.elementLetter}`); // new id

    return this.cacheId.get(cacheKey)!;
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

    this.namespaces.set(suspenseId, {
      suspenseLetter: startLetter,
      elementLetter: '',
      startLetter,
    });
  }
}

export default SuspenseStore;
