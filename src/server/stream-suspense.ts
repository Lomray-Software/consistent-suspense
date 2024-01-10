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
  protected callback: (suspenseId: string, errorMessage?: string) => string | undefined | void;

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
   * Run callback and remove suspense from memory
   */
  protected flushSuspense(id: string, errorMessage?: string): string | undefined | void {
    const { suspenseId } = this.suspendIds.get(id) ?? {};

    if (!suspenseId) {
      return;
    }

    this.suspendIds.delete(id);

    return this.callback(suspenseId, errorMessage);
  }

  /**
   * Parse error suspense chunk
   */
  protected obtainErrorSuspense(html: string): string | undefined | void {
    // detect replaces suspense ids
    const { from, error } =
      html.match(/\$RX\("(?<from>[^"]+)",\s*"(?<to>[^"]*)",\s*"(?<error>[^"]*)"/)?.groups ?? {};

    if (!error || !from) {
      return;
    }

    return this.flushSuspense(from, error);
  }

  /**
   * Parse complete suspense chunk
   */
  protected obtainCompleteSuspense(html: string): string | undefined | void {
    // detect replaces suspense ids
    const { from, to } = html.match(/\$RC\("(?<from>[^"]+)","(?<to>[^"]+)"\)/)?.groups ?? {};
    const suspendId = this.replaceSuspendIds(from, to);

    if (!suspendId) {
      return this.obtainErrorSuspense(html);
    }

    return this.flushSuspense(suspendId);
  }
}

export default StreamSuspense;
