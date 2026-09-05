const jsonString = String.raw`"(?:\\.|[^"\\])*"`;
const completionRegexp = new RegExp(
  String.raw`\$(?<kind>RC|RX)\(\s*(?<args>${jsonString}(?:,\s*${jsonString}){0,4})\s*\)`,
  'g',
);
const tagRegexp = /^<(?:"[^"]*"|'[^']*'|[^'">])*>/;

/**
 * NOTE: use with renderToPipeableStream
 */
class StreamSuspense {
  /**
   * Obtained suspense from application shell
   */
  protected suspendIds: Map<string, { suspenseId: string }> = new Map();

  protected pending = '';

  protected templateId: string | undefined;

  /**
   * Fired when react stream write complete suspense
   */
  protected callback: (suspenseId: string, errorMessage?: string) => string | undefined | void;

  protected constructor(callback: StreamSuspense['callback']) {
    this.callback = callback;
  }

  public static create(callback: StreamSuspense['callback']): StreamSuspense {
    return new StreamSuspense(callback);
  }

  /**
   * Return rewritten HTML, withholding unfinished tags and scripts until the next
   * write. An empty string is intentional; callers must use ?? rather than ||.
   */
  public analyze(html: string): string | undefined | void {
    this.pending += html;
    let output = '';

    while (this.pending) {
      const start = this.pending.indexOf('<');

      if (start !== 0) {
        const end = start === -1 ? this.pending.length : start;

        output += this.pending.slice(0, end);
        this.pending = this.pending.slice(end);
        continue;
      }

      if (this.pending.startsWith('<!--')) {
        const end = this.pending.indexOf('-->');

        if (end === -1) {
          break;
        }

        output += this.pending.slice(0, end + 3);
        this.pending = this.pending.slice(end + 3);
        continue;
      }

      const tag = this.pending.match(tagRegexp)?.[0];

      if (!tag) {
        break;
      }

      if (/^<script(?:\s|>)/i.test(tag)) {
        const close = /<\/script\s*>/i.exec(this.pending.slice(tag.length));

        if (!close) {
          break;
        }

        const end = tag.length + close.index + close[0].length;
        const script = this.pending.slice(0, end);
        const suspenseId = tag.match(/\bdata-suspense-id="([^"]+)"/)?.[1];

        if (suspenseId && this.templateId) {
          this.suspendIds.set(this.templateId, { suspenseId });
        }

        this.templateId = undefined;
        output += this.completeScript(script, tag);
        this.pending = this.pending.slice(end);
        continue;
      }

      if (/^<template(?:\s|>)/i.test(tag)) {
        this.templateId = tag.match(/\bid="([^"]+)"/)?.[1];
      } else if (!/^<\/template\s*>/i.test(tag)) {
        this.templateId = undefined;
      }

      output += tag;
      this.pending = this.pending.slice(tag.length);
    }

    return output;
  }

  /**
   * Flush a final unfinished token verbatim when the response stream ends.
   */
  public end(): string {
    const tail = this.pending;

    this.pending = '';
    this.templateId = undefined;
    this.suspendIds.clear();

    return tail;
  }

  /**
   * Keep React's helper definitions in place, then emit state for every completed
   * boundary before executing its reveal/error instruction. Preserve script attrs.
   */
  protected completeScript(script: string, openingTag: string): string {
    let state = '';
    const instructions: string[] = [];
    const rewritten = script.replace(
      completionRegexp,
      (instruction: string, ...matches: unknown[]) => {
        const { kind, args } = matches[matches.length - 1] as { kind: string; args: string };
        const [from, , error] = JSON.parse(`[${args}]`) as string[];
        const entry = this.suspendIds.get(from);

        if (!entry) {
          return instruction;
        }

        this.suspendIds.delete(from);
        state += this.callback(entry.suspenseId, kind === 'RX' ? error : undefined) || '';
        instructions.push(instruction);

        return '';
      },
    );

    if (!instructions.length) {
      return script;
    }

    return `${rewritten}${state}${openingTag}${instructions.join(';')};</script>`;
  }
}

export default StreamSuspense;
