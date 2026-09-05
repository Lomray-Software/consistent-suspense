import { Writable } from 'node:stream';
import type { ReactNode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';

export const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const renderStream = (tree: ReactNode, onShell: () => void): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const chunks: string[] = [];
    const destination = new Writable({
      write(chunk: Buffer, encoding, done) {
        chunks.push(chunk.toString());
        done();
      },
    });

    destination.on('finish', () => resolve(chunks));
    destination.on('error', reject);

    const stream = renderToPipeableStream(tree, {
      onShellReady() {
        stream.pipe(destination);
        onShell();
      },
      onError: () => undefined,
      onShellError: reject,
    });
  });
