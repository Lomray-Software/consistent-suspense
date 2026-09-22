const jsonString = String.raw`"(?:\\.|[^"\\])*"`;
const completionRegexp = new RegExp(
  String.raw`\$(?<kind>RC|RX)\(\s*(?<args>${jsonString}(?:,\s*${jsonString}){0,4})\s*\)`,
  'g',
);
const tagRegexp = /<(?:"[^"]*"|'[^']*'|[^'">])*>/y;
const scriptCloseRegexp = /<\/script\s*>/gi;
const SLASH = 47;
const UPPER_S = 83;
const UPPER_T = 84;
const LOWER_S = 115;
const LOWER_T = 116;

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
    const source = this.pending + html;
    const { length } = source;
    let output = '';
    let position = 0;

    while (position < length) {
      const start = source.indexOf('<', position);

      if (start !== position) {
        const end = start === -1 ? length : start;

        output += source.slice(position, end);
        position = end;
        continue;
      }

      if (source.startsWith('<!--', position)) {
        const end = source.indexOf('-->', position);

        if (end === -1) {
          break;
        }

        output += source.slice(position, end + 3);
        position = end + 3;
        continue;
      }

      tagRegexp.lastIndex = position;

      const tag = tagRegexp.exec(source)?.[0];

      if (!tag) {
        break;
      }

      // Only script, template and closing tags need the regexp checks below.
      const second = source.charCodeAt(position + 1);

      if ((second === LOWER_S || second === UPPER_S) && /^<script(?:\s|>)/i.test(tag)) {
        scriptCloseRegexp.lastIndex = position + tag.length;

        const close = scriptCloseRegexp.exec(source);

        if (!close) {
          break;
        }

        const end = close.index + close[0].length;
        const script = source.slice(position, end);
        const suspenseId = tag.match(/\bdata-suspense-id="([^"]+)"/)?.[1];

        if (suspenseId && this.templateId) {
          this.suspendIds.set(this.templateId, { suspenseId });
        }

        this.templateId = undefined;
        output += this.completeScript(script, tag);
        position = end;
        continue;
      }

      if ((second === LOWER_T || second === UPPER_T) && /^<template(?:\s|>)/i.test(tag)) {
        this.templateId = tag.match(/\bid="([^"]+)"/)?.[1];
      } else if (second !== SLASH || !/^<\/template\s*>/i.test(tag)) {
        this.templateId = undefined;
      }

      output += tag;
      position += tag.length;
    }

    this.pending = source.slice(position);

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
