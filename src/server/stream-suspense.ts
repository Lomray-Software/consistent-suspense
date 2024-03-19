const suspenseRegexp = /\$RC\("(?<from>[^"]+)","(?<to>[^"]+)"\)/;
const suspenseErrorRegexp = /\$RX\("(?<from>[^"]+)",\s*"(?<to>[^"]*)",\s*"(?<error>[^"]*)"\)/;

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
  protected flushSuspense(
    id: string,
    html: string,
    errorMessage?: string,
  ): string | undefined | void {
    const { suspenseId } = this.suspendIds.get(id) ?? {};

    if (!suspenseId) {
      return;
    }

    this.suspendIds.delete(id);

    const suspenseReplacers = new Set<string>([]);
    const replacer = (suspense: string): string => {
      suspenseReplacers.add(suspense);

      return '';
    };
    const modifiedHtml = html
      .replace(suspenseRegexp, replacer)
      .replace(suspenseErrorRegexp, replacer)
      .replace('<script></script>', '');
    const replacersHtml = `<script>${[...suspenseReplacers].join(';')};</script>`;

    // Return React chunk then custom html then React suspense replacers
    return modifiedHtml + this.callback(suspenseId, errorMessage) + replacersHtml;
  }

  /**
   * Parse error suspense chunk
   */
  protected obtainErrorSuspense(html: string): string | undefined | void {
    // detect replaces suspense ids
    const { from, error } = html.match(suspenseErrorRegexp)?.groups ?? {};

    if (!error || !from) {
      return;
    }

    return this.flushSuspense(from, html, error);
  }

  /**
   * Parse complete suspense chunk
   */
  protected obtainCompleteSuspense(html: string): string | undefined | void {
    // detect replaces suspense ids
    const { from, to } = html.match(suspenseRegexp)?.groups ?? {};
    const suspendId = this.replaceSuspendIds(from, to);

    if (!suspendId) {
      return this.obtainErrorSuspense(html);
    }

    return this.flushSuspense(suspendId, html);
  }
}

export default StreamSuspense;
