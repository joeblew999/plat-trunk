// url-params.test.ts — Contract test for parseUrlParams().
//
// Tests all URL patterns as a pure function — no browser, no window mocking.
// This replaces manual "type this URL and check the result" testing.
// If parseUrlParams() breaks for any pattern, this test catches it.

import { describe, it, expect } from 'vitest';
import { parseUrlParams } from '../../web/url-params';

describe('parseUrlParams', () => {
    it.each([
        // path pattern                       search              expected
        ['/model/abc123',  '',                { modelId: 'abc123',    example: null,        reset: false }],
        ['/model/new',     '',                { modelId: null,        example: null,        reset: false }],
        ['/',              '?model=xyz',      { modelId: 'xyz',       example: null,        reset: false }],
        ['/',              '?example=a.json', { modelId: null,        example: 'a.json',    reset: false }],
        ['/',              '?reset=1',        { modelId: null,        example: null,        reset: true  }],
        ['/model/abc',     '?reset=1',        { modelId: 'abc',       example: null,        reset: true  }],
        ['/model/abc',     '?example=b.json&reset=1', { modelId: 'abc', example: 'b.json', reset: true  }],
        ['/',              '',                { modelId: null,        example: null,        reset: false }],
    ] as const)('path="%s" search="%s"', (path, search, expected) => {
        expect(parseUrlParams({ pathname: path, search })).toEqual(expected);
    });
});
