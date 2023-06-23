/**
 * NOTE: use with renderToPipeableStream
 */
class StreamSuspense {
  /**
   * Obtained suspense from application shell
   */
  protected suspendIds: Map<string, { contextId: string; count: number }>;

  /**
   * Fired when react stream write complete suspense
   * count - children count inside suspense
   */
  protected callback: (suspenseId: string, count: number) => string | undefined;

  /**
   * @constructor
   */
  protected constructor(callback: StreamSuspense['callback']) {
    this.callback = callback;
  }

  /**
   * Create stream stores service
   */
  public static create(callback: StreamSuspense['callback']): StreamSuspense {
    return new StreamSuspense(callback);
  }

  /**
   * Analyze react stream html and call callback if suspense output found.
   */
  public analyze(html: string): string | undefined {
    this.obtainSuspense(html);

    return this.obtainCompleteSuspense(html);
  }

  /**
   * Parse suspense and related stores context id from application shell
   */
  protected obtainSuspense(html: string): void {
    // If app shell streams only once, run parser only once
    if (this.suspendIds) {
      return;
    }

    // try to find suspense ids with store context ids (react doesn't provide any api to obtain suspend id)
    const matchedTemplates = [
      ...html.matchAll(
        /<template id="(?<templateId>[^"]+)".+?<script data-context-id="(?<contextId>[^"]+)".+?data-count="(?<count>[^"]+)">/g,
      ),
    ];

    if (!matchedTemplates.length) {
      return;
    }

    this.suspendIds = new Map();

    matchedTemplates.forEach(({ groups }) => {
      const { templateId, contextId, count } = groups ?? {};

      if (!templateId) {
        return;
      }

      this.suspendIds.set(templateId, { contextId, count: Number(count) });
    });
  }

  /**
   * Replace suspend id
   */
  protected replaceSuspendIds(formId: string, toId: string): string | undefined {
    if (!formId || !this.suspendIds.has(formId)) {
      return;
    }

    this.suspendIds.set(toId, this.suspendIds.get(formId)!);
    this.suspendIds.delete(formId);

    return toId;
  }

  /**
   * Parse complete suspense chunk
   */
  protected obtainCompleteSuspense(html: string): string | undefined {
    // each suspense begin from
    if (!html.startsWith('<div hidden id=')) {
      return;
    }

    // detect replaces suspense ids
    const { from, to } = html.match(/\$RC\("(?<from>[^"]+)","(?<to>[^"]+)"\)/)?.groups ?? {};
    const suspendId = this.replaceSuspendIds(from, to);

    if (!suspendId) {
      return;
    }

    const { contextId, count } = this.suspendIds.get(suspendId) ?? {};

    if (!contextId || !count) {
      return;
    }

    return this.callback(contextId, count);
  }
}

export default StreamSuspense;
