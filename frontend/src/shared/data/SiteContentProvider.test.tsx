import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Link } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SiteContentProvider, useHomeContent, useResourceContent, useSiteSettings } from './SiteContentProvider';
import rawHome from '../../content/home/explore.json';
import settings from '../../content/site/settings.json';
import categories from '../../content/resources/categories.json';
import courses from '../../content/resources/pages/courses.json';
import scholarships from '../../content/resources/pages/scholarships.json';
import exchange from '../../content/resources/pages/exchange.json';
import graduate from '../../content/resources/pages/graduate.json';

const data = () => ({ home: { ...rawHome, title: 'API 首頁', slides: rawHome.slides.map(slide => ({ ...slide, alt: slide.title })) },
  settings: { ...settings, siteContact: { ...settings.siteContact, email: 'published@example.com' } },
  resources: { categories, pages: [courses, scholarships, exchange, graduate].map(({ $schema: _schema, ...page }) => page) } });
function Consumer() {
  const home = useHomeContent();
  const contact = useSiteSettings();
  const resources = useResourceContent();
  return <><h1>{home?.title ?? '沒有公開首頁'}</h1><p>{contact.siteContact.email}</p><p>{resources.resourceOrder.join(',')}</p><Link to="/contact">換頁</Link></>;
}
const open = () => render(<MemoryRouter><SiteContentProvider><Consumer /></SiteContentProvider></MemoryRouter>);
beforeEach(() => { vi.stubEnv('VITE_SITE_CONTENT_SOURCE', 'api'); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('reads a shared public API snapshot and reloads it when changing routes', async () => {
  const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(data()), { status: 200 }));
  request.mockImplementation(async () => new Response(JSON.stringify(data()), { status: 200 }));
  vi.stubGlobal('fetch', request);
  open();
  await screen.findByRole('heading', { name: 'API 首頁' });
  expect(screen.getByText('published@example.com')).toBeInTheDocument();
  expect(screen.getByText('courses,scholarships,exchange,graduate')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: '換頁' }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  await screen.findByRole('heading', { name: 'API 首頁' });
});
it('keeps API failures visible, retries and does not show static fallback contact data', async () => {
  const request = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValueOnce(new Response(JSON.stringify(data()), { status: 200 }));
  vi.stubGlobal('fetch', request);
  open();
  await screen.findByRole('alert');
  expect(screen.queryByText('eesa@nycu.edu.tw')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '重試網站內容' }));
  await screen.findByText('published@example.com');
});
it('null publications stay absent rather than returning legacy resources or settings', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ home: null, resources: null, settings: null }), { status: 200 })));
  open();
  await screen.findByRole('heading', { name: '沒有公開首頁' });
  expect(screen.queryByText('courses,scholarships,exchange,graduate')).not.toBeInTheDocument();
  expect(screen.queryByText('eesa@nycu.edu.tw')).not.toBeInTheDocument();
});
