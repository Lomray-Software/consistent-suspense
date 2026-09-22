import sinon from 'sinon';
import { afterAll } from 'vitest';

afterAll(() => {
  sinon.restore();
});
