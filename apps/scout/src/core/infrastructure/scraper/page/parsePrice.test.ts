import { describe, it, expect } from 'vitest';
import { parsePrice } from './parsePrice';

describe('parsePrice', () => {
  it('parses ES format with symbol', () => {
    expect(parsePrice('12,70 €')).toBe(12.7);
  });

  it('parses ES format with thousands separator', () => {
    expect(parsePrice('1.234,56 €')).toBe(1234.56);
  });

  it('parses US format with dot as decimal', () => {
    expect(parsePrice('12.70')).toBe(12.7);
  });

  it('parses raw number (Shopify cents style still works as float)', () => {
    expect(parsePrice(1270)).toBe(1270);
  });

  it('returns null for garbage', () => {
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
  });

  it('handles US format with thousands separator', () => {
    expect(parsePrice('1,234.56')).toBe(1234.56);
  });

  it('treats trailing 3-digit comma as thousands, not decimal', () => {
    expect(parsePrice('1,234')).toBe(1234);
  });

  it('handles Infinity as invalid', () => {
    expect(parsePrice(Infinity)).toBeNull();
    expect(parsePrice(NaN)).toBeNull();
  });

  it('strips currency codes and text', () => {
    expect(parsePrice('EUR 9,90')).toBe(9.9);
    expect(parsePrice('$1,299.00')).toBe(1299);
  });
});
