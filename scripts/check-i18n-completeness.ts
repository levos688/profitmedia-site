import {
  getAboutContent,
  getHomeContent,
} from '../src/i18n/content';
import { assertContentCompleteness } from '../src/i18n/completeness';

const sourceFixture = {
  nested: {
    items: ['first', 'second'],
  },
};
const shortenedFixture = {
  nested: {
    items: ['translated first'],
  },
};
const expectedMessage =
  'fixture.nested.items: expected array length 2, received 1';

let failureMessage = '';
try {
  assertContentCompleteness(sourceFixture, shortenedFixture, 'fixture');
} catch (error) {
  failureMessage = error instanceof Error ? error.message : String(error);
}

if (failureMessage !== expectedMessage) {
  throw new Error(
    `Shortened-array check did not fail at the expected path. Received: ${failureMessage || 'no error'}`
  );
}

getHomeContent('ru');
getAboutContent('ru');

console.log(`RED PASS: ${failureMessage}`);
console.log('GREEN PASS: actual home and About bundles are complete');
