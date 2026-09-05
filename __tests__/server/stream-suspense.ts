import { Transform } from 'node:stream';
import { describe, expect, it } from 'vitest';
import development from '../../__helpers__/fixtures/react19-error-development.json';
import production from '../../__helpers__/fixtures/react19-error-production.json';
import { StreamSuspense } from '../../src/server';

const shell =
  '<!--$?--><template id="B:0"></template><script data-suspense-id="a"></script>wait<!--/$-->';
const success = '<div hidden id="S:0">done</div><script nonce="test">$RC("B:0","S:0")</script>';
const message = 'failed with "quotes" and a \\ slash';
const devError = `<script>$RX(${['B:0', '', message, 'stack\nline', 'component stack'].map((arg) => JSON.stringify(arg)).join(',')})</script>`;
const prodError = '<script>$RX("B:0")</script>';
const state = '<script>window.stateReady = true;</script>';

const run = (chunks: string[]) => {
  const calls: { id: string; error?: string }[] = [];
  const parser = StreamSuspense.create((id, error) => {
    calls.push({ id, error });

    return state;
  });
  const output = chunks.map((chunk) => parser.analyze(chunk) ?? chunk).join('') + parser.end();

  return { calls, output };
};

describe('StreamSuspense', () => {
  it.each([development, production])(
    'parses captured React 19 $mode error output',
    ({ mode, chunks }) => {
      const { calls, output } = run(chunks);

      expect(calls).toHaveLength(1);
      expect(calls[0].id).toBe('a');

      if (mode === 'development') {
        expect(calls[0].error).toContain('failure with "escaped quotes"');
      } else {
        expect(calls[0].error).toBeUndefined();
      }

      expect(output.indexOf(state)).toBeLessThan(output.indexOf('$RX("'));
    },
  );

  it.each([success, devError, prodError])(
    'handles every split point of a shell and completion: %s',
    (completion) => {
      const html = shell + completion;

      for (let split = 0; split <= html.length; split++) {
        const { calls, output } = run([html.slice(0, split), html.slice(split)]);

        expect(calls).toEqual([{ id: 'a', error: completion === devError ? message : undefined }]);
        expect(output.indexOf(state)).toBeLessThan(output.search(/\$R[CX]\(/));
        expect(output).toContain(
          completion === success ? '<script nonce="test">$RC(' : '<script>$RX(',
        );
      }

      expect(run([...html])).toEqual(run([html]));
    },
  );

  it('handles every success and error in a single script without touching unknown boundaries', () => {
    const calls: string[] = [];
    const parser = StreamSuspense.create((id) => {
      calls.push(id);

      return `<script>state_${id}()</script>`;
    });
    const markers = ['a', 'b', 'c']
      .map((id, i) => shell.replaceAll('B:0', `B:${i}`).replace('id="a"', `id="${id}"`))
      .join('');
    const html = `${markers}<script>helper();$RC("B:0","S:0");$RX("B:1");$RC("B:2","S:2");$RC("B:9","S:9")</script>`;
    const output = parser.analyze(html) as string;

    expect(calls).toEqual(['a', 'b', 'c']);
    for (const [i, id] of calls.entries()) {
      expect(output.indexOf(`state_${id}`)).toBeLessThan(
        output.search(new RegExp(`\\$R[CX]\\("B:${i}"`)),
      );
    }
    expect(output).toContain('$RC("B:9","S:9")');
    expect(parser.analyze('<script>$RC("B:0","S:0")</script>')).toBe(
      '<script>$RC("B:0","S:0")</script>',
    );
    expect(calls).toHaveLength(3);
  });

  it('does not interpret markers or completions inside comments and preserves ordinary HTML', () => {
    const html = `<p title=">">text</p><!-- ${shell.replace(/<!--.*?-->/g, '')}${success} -->`;

    expect(run([...html])).toEqual({ calls: [], output: html });
  });

  it('withholds incomplete scripts and flushes a final tail exactly once', () => {
    const parser = StreamSuspense.create(() => state);

    expect(parser.analyze('<scr')).toBe('');
    expect(parser.analyze('ipt>$RC("B:0"')).toBe('');
    expect(parser.end()).toBe('<script>$RC("B:0"');
    expect(parser.end()).toBe('');
  });

  it('flushes a response transform at end of stream', async () => {
    const parser = StreamSuspense.create(() => state);
    const transform = new Transform({
      transform(chunk: Buffer, encoding, done) {
        done(null, parser.analyze(chunk.toString()) ?? chunk);
      },
      flush(done) {
        done(null, parser.end());
      },
    });
    const chunks: Buffer[] = [];

    transform.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<void>((resolve) => {
      transform.on('end', resolve);
    });

    transform.end('plain text<scr');
    await finished;
    expect(Buffer.concat(chunks).toString()).toBe('plain text<scr');
  });
});
