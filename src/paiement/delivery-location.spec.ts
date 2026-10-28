import { BadRequestException } from '@nestjs/common';
import { parseDeliveryLocation } from './fedapay.service';

describe('parseDeliveryLocation', () => {
  it('returns null when no delivery address is sent', () => {
    expect(parseDeliveryLocation(undefined)).toBeNull();
    expect(parseDeliveryLocation('')).toBeNull();
  });

  it('accepts Google Maps links and captured positions', () => {
    expect(parseDeliveryLocation(' https://www.google.com/maps?q=6.13,1.22 ')).toBe('https://www.google.com/maps?q=6.13,1.22');
    expect(parseDeliveryLocation('https://maps.app.goo.gl/abc123')).toBe('https://maps.app.goo.gl/abc123');
  });

  it('rejects free text, other hosts and non-maps Google pages', () => {
    for (const value of ['Lomé, quartier Bè', 'https://evil.example/maps', 'http://www.google.com/maps?q=1,1', 'https://www.google.com/search?q=x', 42]) {
      expect(() => parseDeliveryLocation(value)).toThrow(BadRequestException);
    }
  });
});
