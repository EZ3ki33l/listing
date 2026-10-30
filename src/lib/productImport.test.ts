import { describe, expect, it } from 'vitest';
import { extractImages, isPrivateIp } from './productImport';

describe('isPrivateIp', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1'])('refuse %s', (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });
  it.each(['8.8.8.8', '172.32.0.1', '93.184.216.34', '2606:4700::1111'])('accepte %s', (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });
});

describe('extractImages', () => {
  const html = `
    <meta property="og:image" content="https://cdn.x.fr/a.jpg?w=1&amp;h=2">
    <meta name="twitter:image" content="/rel.jpg">
    <meta property="og:image" content="http://cdn.x.fr/insecure.jpg">
    <script type="application/ld+json">{"@type":"Product","image":["https://cdn.x.fr/b.jpg",{"url":"https://cdn.x.fr/a.jpg?w=1&h=2"}]}</script>
    <script type="application/ld+json">{cassé</script>`;

  it('garde og:image, twitter:image et JSON-LD, en https, sans doublon', () => {
    expect(extractImages(html, 'https://shop.fr/p/1')).toEqual([
      'https://cdn.x.fr/a.jpg?w=1&h=2',
      'https://shop.fr/rel.jpg',
      'https://cdn.x.fr/b.jpg',
    ]);
  });
});
