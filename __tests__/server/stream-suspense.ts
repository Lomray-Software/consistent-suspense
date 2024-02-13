import { expect } from 'chai';
import { describe, it } from 'vitest';
import { StreamSuspense } from '../../src/server';

describe('StreamSuspense', () => {
  it('should analyze HTML and obtain suspense', () => {
    const firstPartHtml = `
      <div>
        <template id="B:0"><script data-suspense-id="a:a"></script></template>
        <template id="B:1"><script data-suspense-id="a:b"></script></template>
      </div>
    `;
    const secondPartHtml = `
      <div hidden id="S:0">Test content</div>
      <script>function $RC(a, b) {a = document.getElementById(a); b = document.getElementById(b); b.parentNode.removeChild(b);</script>
      <script>const a=1;$RC("B:0","S:0")</script>
    `;

    const streamSuspense = StreamSuspense.create((suspenseId) => {
      if (suspenseId === 'a:a') {
        return '<script>const AA=true;';
      }

      return '';
    });

    const result1 = streamSuspense.analyze(firstPartHtml);
    const result2 = streamSuspense.analyze(secondPartHtml);

    expect(result1).to.be.undefined;
    expect(result2).to.equal(`
      <div hidden id="S:0">Test content</div>
      <script>function $RC(a, b) {a = document.getElementById(a); b = document.getElementById(b); b.parentNode.removeChild(b);</script>
      <script>const a=1;</script>
    <script>const AA=true;<script>$RC("B:0","S:0");</script>`);
  });

  it('should analyze HTML and obtain error suspense', () => {
    const firstPartHtml = `
      <div>
        <template id="B:0"><script data-suspense-id="a:a"></script></template>
      </div>
    `;
    const secondPartHtml = `
      <script>function $RX(a, b) {a = document.getElementById(a); b = document.getElementById(b); b.parentNode.removeChild(b);$RX("B:0","S:0","Error message")</script>
    `;

    const streamSuspense = StreamSuspense.create((suspenseId) => {
      if (suspenseId === 'a:a') {
        return '<script>const BB=true;';
      }

      return '';
    });

    const result1 = streamSuspense.analyze(firstPartHtml);
    const result2 = streamSuspense.analyze(secondPartHtml);

    expect(result1).to.be.undefined;
    expect(result2).to.equal(`
      <script>function $RX(a, b) {a = document.getElementById(a); b = document.getElementById(b); b.parentNode.removeChild(b);</script>
    <script>const BB=true;<script>$RX("B:0","S:0","Error message");</script>`);
  });
});
