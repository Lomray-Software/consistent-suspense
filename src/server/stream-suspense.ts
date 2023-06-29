/**
 * NOTE: use with renderToPipeableStream
 */
class StreamSuspense {
  /**
   * Obtained suspense from application shell
   */
  protected suspendIds: Map<string, { suspenseId: string }> = new Map();

  /**
   * Fired when react stream write complete suspense
   */
  protected callback: (suspenseId: string) => string | undefined | void;

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
  public analyze(html: string): string | undefined | void {
    this.obtainSuspense(html);

    return this.obtainCompleteSuspense(html);
  }

  /**
   * Parse suspense and related stores context id from application shell
   */
  protected obtainSuspense(html: string): void {
    // try to find suspense ids with store context ids (react doesn't provide any api to obtain suspend id)
    const matchedTemplates = [
      ...html.matchAll(
        /<template id="(?<templateId>[^"]+)".+?<script data-suspense-id="(?<suspenseId>[^"]+)">/g,
      ),
    ];

    if (!matchedTemplates.length) {
      return;
    }

    matchedTemplates.forEach(({ groups }) => {
      const { templateId, suspenseId } = groups ?? {};

      if (!templateId) {
        return;
      }

      this.suspendIds.set(templateId, { suspenseId });
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
  protected obtainCompleteSuspense(html: string): string | undefined | void {
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

    const { suspenseId } = this.suspendIds.get(suspendId) ?? {};

    if (!suspenseId) {
      return;
    }

    this.suspendIds.delete(suspendId);

    return this.callback(suspenseId);
  }
}

export default StreamSuspense;
