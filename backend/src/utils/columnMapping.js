// Column name mapping - maps common Swedish/English header names to DB fields
export const COLUMN_MAP = {
  company: ['company', 'företag', 'foretag', 'firma', 'bolag', 'name'],
  contact_name: ['contact_name', 'contact_person', 'kontakt', 'kontaktperson', 'contact'],
  phone: ['phone', 'telefon', 'tel', 'telefonnummer', 'mobilnummer', 'mobil'],
  email: ['email', 'e-post', 'epost', 'e-mail', 'mail'],
  title: ['title', 'titel', 'befattning', 'roll', 'role', 'position', 'contact_title'],
  industry: ['industry', 'bransch', 'sektor', 'sector', 'sni_code'],
  city: ['city', 'stad', 'ort', 'postort', 'kommun', 'location'],
};

export function detectColumnMapping(headers) {
  const mapping = {};
  const mappedHeaders = new Set();

  for (const [dbField, aliases] of Object.entries(COLUMN_MAP)) {
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      if (aliases.includes(normalized)) {
        mapping[header] = dbField;
        mappedHeaders.add(header);
        break;
      }
    }
  }

  const customHeaders = headers.filter(h => !mappedHeaders.has(h));
  return { mapping, customHeaders };
}
