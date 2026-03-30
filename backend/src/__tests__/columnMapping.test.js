import { describe, it, expect } from 'vitest';
import { COLUMN_MAP, detectColumnMapping } from '../utils/columnMapping.js';

describe('COLUMN_MAP', () => {
  it('defines aliases for all required database fields', () => {
    const expectedFields = ['company', 'contact_name', 'phone', 'email', 'title', 'industry', 'city'];
    for (const field of expectedFields) {
      expect(COLUMN_MAP[field]).toBeDefined();
      expect(Array.isArray(COLUMN_MAP[field])).toBe(true);
      expect(COLUMN_MAP[field].length).toBeGreaterThan(0);
    }
  });
});

describe('detectColumnMapping', () => {
  it('maps standard English column headers to database fields', () => {
    const headers = ['company', 'contact_name', 'phone', 'email', 'title', 'industry', 'city'];
    const { mapping, customHeaders } = detectColumnMapping(headers);

    expect(mapping).toEqual({
      company: 'company',
      contact_name: 'contact_name',
      phone: 'phone',
      email: 'email',
      title: 'title',
      industry: 'industry',
      city: 'city',
    });
    expect(customHeaders).toHaveLength(0);
  });

  it('maps Swedish column headers to database fields', () => {
    const headers = ['Företag', 'Kontaktperson', 'Telefon', 'E-post', 'Befattning', 'Bransch', 'Ort'];
    const { mapping, customHeaders } = detectColumnMapping(headers);

    expect(mapping['Företag']).toBe('company');
    expect(mapping['Kontaktperson']).toBe('contact_name');
    expect(mapping['Telefon']).toBe('phone');
    expect(mapping['E-post']).toBe('email');
    expect(mapping['Befattning']).toBe('title');
    expect(mapping['Bransch']).toBe('industry');
    expect(mapping['Ort']).toBe('city');
    expect(customHeaders).toHaveLength(0);
  });

  it('identifies unmapped headers as custom headers', () => {
    const headers = ['company', 'phone', 'Revenue', 'Employee Count'];
    const { mapping, customHeaders } = detectColumnMapping(headers);

    expect(mapping['company']).toBe('company');
    expect(mapping['phone']).toBe('phone');
    expect(customHeaders).toEqual(['Revenue', 'Employee Count']);
  });

  it('handles case-insensitive matching', () => {
    const headers = ['COMPANY', 'Phone', 'EMAIL'];
    const { mapping } = detectColumnMapping(headers);

    expect(mapping['COMPANY']).toBe('company');
    expect(mapping['Phone']).toBe('phone');
    expect(mapping['EMAIL']).toBe('email');
  });

  it('handles headers with whitespace', () => {
    const headers = ['  company  ', '  phone  '];
    const { mapping } = detectColumnMapping(headers);

    expect(mapping['  company  ']).toBe('company');
    expect(mapping['  phone  ']).toBe('phone');
  });

  it('returns empty mapping for completely unknown headers', () => {
    const headers = ['Foo', 'Bar', 'Baz'];
    const { mapping, customHeaders } = detectColumnMapping(headers);

    expect(Object.keys(mapping)).toHaveLength(0);
    expect(customHeaders).toEqual(['Foo', 'Bar', 'Baz']);
  });

  it('returns empty results for an empty headers array', () => {
    const { mapping, customHeaders } = detectColumnMapping([]);

    expect(Object.keys(mapping)).toHaveLength(0);
    expect(customHeaders).toHaveLength(0);
  });

  it('maps alternative aliases correctly', () => {
    const headers = ['firma', 'kontakt', 'tel', 'mail', 'roll', 'sektor', 'kommun'];
    const { mapping } = detectColumnMapping(headers);

    expect(mapping['firma']).toBe('company');
    expect(mapping['kontakt']).toBe('contact_name');
    expect(mapping['tel']).toBe('phone');
    expect(mapping['mail']).toBe('email');
    expect(mapping['roll']).toBe('title');
    expect(mapping['sektor']).toBe('industry');
    expect(mapping['kommun']).toBe('city');
  });
});
