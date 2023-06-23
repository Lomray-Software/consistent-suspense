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
      contextLetter: string;
      elementLetter: string;
    }
  > = new Map();

  /**
   * Cache context id's
   */
  protected cacheContext: Map<string, string> = new Map();

  /**
   * Cache generated id's
   * @protected
   */
  protected cacheId: Map<string, string> = new Map();

  /**
   * @constructor
   */
  protected constructor() {
    //
  }

  /**
   * Create store
   */
  public static create(): SuspenseStore {
    return new SuspenseStore();
  }

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
  protected getNextContextId(num: number | string, parentId?: string) {
    return parentId ? `${parentId}:${num}` : `${num}`;
  }

  /**
   * Generate suspense context id
   */
  public getContextId(parentId: string, cacheKey: string): string {
    // return id from cache (strict mode fix)
    if (this.cacheContext.has(cacheKey)) {
      return this.cacheContext.get(cacheKey)!;
    }

    let nextContextId = this.getNextContextId('a', parentId);
    const currNamespace = this.namespaces.get(nextContextId);

    if (!currNamespace) {
      this.namespaces.set(nextContextId, {
        contextLetter: 'a',
        elementLetter: '',
      });
    } else {
      currNamespace.contextLetter = this.getNextLetter(currNamespace.contextLetter);
      nextContextId = this.getNextContextId(currNamespace.contextLetter);

      this.namespaces.set(nextContextId, {
        contextLetter: '',
        elementLetter: '',
      });
    }

    this.cacheContext.set(cacheKey, nextContextId);

    return nextContextId;
  }

  /**
   * Generate consistent id which doesn't change inside suspense
   */
  public getId(contextId: string, cacheKey: string): string {
    // return id from cache (strict mode fix)
    if (this.cacheId.has(cacheKey)) {
      return this.cacheId.get(cacheKey)!;
    }

    const contextNamespace = this.namespaces.get(contextId)!;
    const nextId = this.getNextLetter(contextNamespace.elementLetter);

    contextNamespace.elementLetter = nextId;

    this.cacheId.set(cacheKey, `${contextId}-${nextId}`); // new id

    return this.cacheId.get(cacheKey)!;
  }
}

export default SuspenseStore;
