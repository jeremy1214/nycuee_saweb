import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readSiteLegacy } from '../src/site-legacy';
import { parseSiteContent, resourceSnapshot, SiteContentError } from '../../shared/site-content';

test('site fixtures preserve home slides, existing resource URLs and global contact values', () => {
  const source = readSiteLegacy();
  assert.equal(source.home.slides.length, 6);
  assert.ok(source.home.slides.every(slide => slide.alt.length > 0));
  assert.deepEqual(resourceSnapshot(source.resources).resourceOrder, ['courses', 'scholarships', 'exchange', 'graduate']);
  assert.equal(source.settings.siteContact.email, 'eesa@nycu.edu.tw');
});
test('homepage rejects executable links, private-looking arbitrary paths and duplicate slide identifiers', () => {
  const { home } = readSiteLegacy();
  for (const to of ['javascript:alert(1)', '//evil.example', 'https://evil.example']) {
    assert.throws(() => parseSiteContent('home', { ...home, link: { ...home.link, to } }), SiteContentError);
  }
  assert.throws(() => parseSiteContent('home', { ...home, slides: [] }), SiteContentError);
  assert.throws(() => parseSiteContent('home', { ...home, slides: [home.slides[0], home.slides[0]] }), SiteContentError);
  assert.throws(() => parseSiteContent('home', { ...home, slides: [{ ...home.slides[0], image: '/private/secret.png' }] }), SiteContentError);
  assert.throws(() => parseSiteContent('home', { ...home, slides: [{ ...home.slides[0], alt: '' }] }), SiteContentError);
});
test('site settings reject credential URLs and unsafe social links, and allow deliberately empty socials', () => {
  const { settings } = readSiteLegacy();
  assert.throws(() => parseSiteContent('settings', { ...settings, siteContact: { ...settings.siteContact, email: 'bad' } }), SiteContentError);
  assert.throws(() => parseSiteContent('settings', { ...settings, siteContact: { ...settings.siteContact, website: 'https://user:secret@example.com' } }), SiteContentError);
  assert.throws(() => parseSiteContent('settings', { ...settings, socialLinks: [{ ...settings.socialLinks[0], href: 'javascript:alert(1)' }] }), SiteContentError);
  assert.deepEqual(parseSiteContent('settings', { ...settings, socialLinks: [] }).socialLinks, []);
});
test('resource CMS reuses the common rules and keeps unpublished page states out of an atomic document', () => {
  const { resources } = readSiteLegacy();
  assert.throws(() => parseSiteContent('resources', { ...resources, pages: [...resources.pages, resources.pages[0]] }), SiteContentError);
  assert.throws(() => parseSiteContent('resources', { ...resources, categories: { ...resources.categories, defaultCategory: 'missing' } }), SiteContentError);
  const invalid = structuredClone(resources);
  invalid.pages[0].links[0].href = 'javascript:alert(1)';
  assert.throws(() => parseSiteContent('resources', invalid), SiteContentError);
});
