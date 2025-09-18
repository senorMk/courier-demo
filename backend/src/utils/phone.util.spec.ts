declare const describe: any;
declare const it: any;
declare const expect: any;

import { normalizeZMBPhone } from './phone.util';

describe('normalizeZMBPhone', () => {
  it.each([
    ['0971234567', '+260971234567'],
    ['+260971234567', '+260971234567'],
    ['260971234567', '+260971234567'],
    ['00260971234567', '+260971234567'],
    ['000260971234567', '+260971234567'],
    ['971234567', '+260971234567'],
    ['021112345', '+26021112345'],
  ])('normalizes %s -> %s', (input, expected) => {
    expect(normalizeZMBPhone(input)).toBe(expected);
  });

  it('returns null for missing input', () => {
    expect(normalizeZMBPhone(undefined)).toBeNull();
    expect(normalizeZMBPhone('')).toBeNull();
    expect(normalizeZMBPhone('0000')).toBeNull();
  });
});
