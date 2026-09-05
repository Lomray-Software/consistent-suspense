import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderStream } from '../../__helpers__/stream';
import { ConsistentSuspenseProvider, Suspense } from '../../src';
import { StreamSuspense } from '../../src/server';

const stream = ({ two = false, padding = 0, error = false } = {}) => {
  let isReady = false;
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  const Item = () => {
    if (!isReady) {
      throw promise;
    }

    if (error) {
      throw new Error('failure with "escaped quotes"');
    }

    return <span>done</span>;
  };

  return renderStream(
    <ConsistentSuspenseProvider>
      <main>
        {Array.from({ length: padding }, (_, i) => (
          <i key={i}>{'x'.repeat(13)}</i>
        ))}
        <Suspense fallback="wait">
          <Item />
        </Suspense>
        {two ? (
          <Suspense fallback="wait2">
            <Item />
          </Suspense>
        ) : null}
      </main>
    </ConsistentSuspenseProvider>,
    () => {
      setTimeout(() => {
        isReady = true;
        resolve();
      }, 5);
    },
  );
};

const analyze = (chunks: string[]) => {
  const calls: { id: string; error?: string }[] = [];
  const parser = StreamSuspense.create((id, error) => {
    calls.push({ id, error });

    return `<script>state_${id}()</script>`;
  });
  const output = chunks.map((chunk) => parser.analyze(chunk) ?? chunk).join('') + parser.end();

  return { calls, output };
};

describe('real React stream writes', () => {
  it('transfers both boundaries completed in one write before their reveal instructions', async () => {
    const chunks = await stream({ two: true });
    const { calls, output } = analyze(chunks);

    expect(chunks.some((chunk) => [...chunk.matchAll(/\$RC\("/g)].length === 2)).toBe(true);
    expect(calls.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(output.indexOf('state_a')).toBeLessThan(output.indexOf('$RC("B:0"'));
    expect(output.indexOf('state_b')).toBeLessThan(output.indexOf('$RC("B:1"'));
  });

  it("registers a marker split across React's 2048-byte write boundary", async () => {
    let splitChunks: string[] | undefined;

    for (let padding = 90; padding <= 110; padding++) {
      const chunks = await stream({ padding });
      const html = chunks.join('');
      const marker = html.indexOf('data-suspense-id');
      let offset = 0;

      for (const chunk of chunks) {
        offset += chunk.length;

        if (offset > marker && offset < marker + 'data-suspense-id'.length) {
          splitChunks = chunks;
        }
      }

      if (splitChunks) {
        break;
      }
    }

    expect(splitChunks).toBeDefined();
    expect(splitChunks![0]).toHaveLength(2048);
    expect(analyze(splitChunks!).calls).toEqual([{ id: 'a', error: undefined }]);
  });

  it('parses real development errors including escaped quotes at every script split', async () => {
    const chunks = await stream({ error: true });
    const html = chunks.join('');
    const baseline = analyze([html]);

    expect(baseline.calls).toHaveLength(1);
    expect(baseline.calls[0].error).toContain('failure with "escaped quotes"');
    const start = html.indexOf('$RX("');

    expect(start).toBeGreaterThan(-1);
    for (let split = start; split <= html.length; split++) {
      expect(analyze([html.slice(0, split), html.slice(split)])).toEqual(baseline);
    }
  });
});
