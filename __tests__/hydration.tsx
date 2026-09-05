import { format } from 'node:util';
import { JSDOM } from 'jsdom';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { pause, renderStream } from '../__helpers__/stream';

describe('streamed hydration', () => {
  it.each([false, true])(
    'keeps IDs after repeated suspension (nested namespace: %s)',
    async (nested) => {
      vi.resetModules();
      let api = await import('../src');
      let ready = 0;
      let resolveFirst!: () => void;
      let resolveSecond!: () => void;
      const first = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });
      const second = new Promise<void>((resolve) => {
        resolveSecond = resolve;
      });
      const attempts: string[] = [];

      const Item = () => {
        const id = api.useId();

        attempts.push(id);

        if (ready === 0) {
          throw first;
        }

        if (ready === 1) {
          throw second;
        }

        return <span id={id}>{id}</span>;
      };
      const tree = () => {
        const { ConsistentSuspenseProvider: Provider, Suspense } = api;

        return (
          <Provider>
            <Suspense fallback="outer">
              {nested ? (
                <Suspense.NS>
                  <Suspense fallback="inner">
                    <Suspense.NS>
                      <Item />
                    </Suspense.NS>
                  </Suspense>
                </Suspense.NS>
              ) : (
                <Item />
              )}
            </Suspense>
          </Provider>
        );
      };
      const chunks = await renderStream(tree(), () => {
        setTimeout(() => {
          ready = 1;
          resolveFirst();
        }, 5);
        setTimeout(() => {
          ready = 2;
          resolveSecond();
        }, 30);
      });

      expect(attempts.length).toBeGreaterThanOrEqual(3);
      expect(new Set(attempts).size, JSON.stringify(attempts)).toBe(1);

      const dom = new JSDOM(`<div id="root">${chunks.join('')}</div>`, {
        url: 'https://test.example',
        runScripts: 'dangerously',
        pretendToBeVisual: true,
      });

      await pause(400);
      vi.stubGlobal('window', dom.window);
      vi.stubGlobal('document', dom.window.document);
      vi.resetModules();
      api = await import('../src');
      const container = dom.window.document.getElementById('root')!;
      const ids = () => [...container.querySelectorAll('span')].map((element) => element.id);
      const before = ids();
      const warnings: string[] = [];
      const error = vi
        .spyOn(console, 'error')
        .mockImplementation((...args) => warnings.push(format(...args)));
      const root = hydrateRoot(container, tree(), {
        onRecoverableError: (e) => warnings.push(String(e)),
      });

      try {
        await pause(100);
        expect(ids()).toEqual(before);
        expect(warnings).toEqual([]);
      } finally {
        root.unmount();
        await pause(20);
        error.mockRestore();
        dom.window.close();
        vi.unstubAllGlobals();
      }
    },
  );
});
