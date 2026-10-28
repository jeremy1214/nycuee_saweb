import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import { activities, activityCategories } from './data/activities';
import { loadActivityContent } from './data/publicContentApi';
import * as calendarExport from '../home/utils/calendarExport';

const original = () => ({ activities: structuredClone(activities), categories: activityCategories.map((c, order) => ({ ...c, order })) });
const response = (content = original()) => new Response(JSON.stringify(content), { status: 200 });
function mount(path = '/') { return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>); }
beforeEach(() => { vi.stubEnv('VITE_ACTIVITY_SOURCE', 'api'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

it('waits for the API before resolving a deep URL and shares one in-flight request', async () => {
  let resolve!: (value: Response) => void;
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(r => { resolve = r; }));
  mount('/activities/smart-ee-camp/groups');
  expect(screen.getByRole('main')).toHaveTextContent('正在載入活動資料');
  expect(screen.queryByText('找不到頁面')).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async () => resolve(response()));
  expect(await screen.findByRole('heading', { level: 1, name: '電機營' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: '活動內容分頁' })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/public/activity-content', expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }));
});

it('shows API errors without JSON fallback and retries', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 503 })).mockImplementation(async () => response());
  mount('/activities/overview');
  const main = screen.getByRole('main');
  expect(await within(main).findByRole('alert')).toHaveTextContent('目前無法載入活動資料');
  expect(within(main).queryByText('活動總覽')).not.toBeInTheDocument();
  fireEvent.click(within(main).getByRole('button', { name: '重試活動資料' }));
  expect(await screen.findByRole('heading', { name: '活動總覽' })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('supports an empty database and resolves 404 only after a successful load', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ activities: [], categories: [] }), { status: 200 }));
  const view = mount('/activities/overview');
  expect(await screen.findByText('目前沒有符合條件的活動。')).toBeInTheDocument();
  view.unmount(); mount('/activities/missing');
  expect(await screen.findByRole('heading', { name: '這個頁面還沒有接上電路。' })).toBeInTheDocument();
});

it('updates announcements, calendar and navigation from one refreshed snapshot', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-28T16:00:00.000Z'));
  let content = original();
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response(content));
  mount();
  await waitFor(() => expect(screen.getByRole('region', { name: '首頁近期活動' })).not.toHaveTextContent('正在載入'));
  content = original();
  const course = content.activities.find(a => a.id === 'course-selection')!;
  course.title = '資料庫更新活動'; course.date = '2026-10-29'; course.endDate = '2026-10-30';
  content.categories.find(c => c.id === 'ee-camp')!.label = '更新營隊分類';
  content.activities.filter(a => a.categoryId === 'ee-camp').forEach(a => { a.category = '更新營隊分類'; });
  fireEvent(window, new Event('focus'));
  const recent = screen.getByRole('region', { name: '首頁近期活動' });
  expect(await within(recent).findByRole('link', { name: '資料庫更新活動，查看活動詳細頁' })).toBeInTheDocument();
  const calendar = screen.getByRole('region', { name: '行事曆' });
  expect(within(calendar).getAllByRole('link', { name: '資料庫更新活動，查看活動詳細頁' })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: '展開系上活動選單' }));
  expect(within(screen.getByRole('navigation', { name: '系上活動內容連結' })).getByRole('link', { name: /更新營隊分類/ })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('rebuilds search and ICS from refreshed public content', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-28T16:00:00.000Z'));
  let content = original();
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response(content));
  const download = vi.spyOn(calendarExport, 'downloadCalendar').mockImplementation(() => {});
  mount();
  const recent = screen.getByRole('region', { name: '首頁近期活動' });
  await waitFor(() => expect(recent).not.toHaveTextContent('正在載入'));
  content = original();
  const course = content.activities.find(a => a.id === 'course-selection')!;
  course.title = '資料庫更新活動'; course.date = '2026-10-29'; course.endDate = '2026-10-30';
  fireEvent(window, new Event('focus'));
  await within(recent).findByRole('link', { name: '資料庫更新活動，查看活動詳細頁' });
  const calendar = screen.getByRole('region', { name: '行事曆' });
  fireEvent.click(screen.getByRole('button', { name: '搜尋網站' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '資料庫更新活動' } });
  expect(within(screen.getByRole('dialog')).getAllByRole('link').some(link => link.getAttribute('href')?.includes('course-selection'))).toBe(true);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /關閉/ }));
  fireEvent.click(within(calendar).getByRole('button', { name: '匯入 Google 日曆' }));
  fireEvent.click(screen.getByRole('button', { name: '下載全部活動' }));
  expect(download).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: course.id, title: course.title, endDate: course.endDate })]));
});

it('revalidates route changes and rejects invalid API fields', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response());
  mount('/activities/overview'); await screen.findByRole('heading', { name: '活動總覽' });
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ...original(), leakedDraft: 'private' }), { status: 200 }));
  fireEvent.click(within(screen.getByRole('group', { name: '依活動分類篩選' })).getByRole('link', { name: '電機營，查看活動詳細頁' }));
  expect(await within(screen.getByRole('main')).findByRole('alert')).toHaveTextContent('回應格式不正確');
  expect(screen.queryByRole('heading', { name: '電機營' })).not.toBeInTheDocument();
});

it('aborts a pending request when the public shell unmounts', () => {
  let signal: AbortSignal;
  vi.spyOn(globalThis, 'fetch').mockImplementation((_url, options) => { signal = options!.signal as AbortSignal; return new Promise(() => {}); });
  const view = mount('/activities/overview'); view.unmount();
  expect(signal!.aborted).toBe(true);
});

it('loads explicit JSON mode with validation and no network request', async () => {
  vi.stubEnv('VITE_ACTIVITY_SOURCE', 'json');
  const fetchMock = vi.spyOn(globalThis, 'fetch');
  const content = await loadActivityContent(new AbortController().signal);
  expect(content.activities).toHaveLength(11); expect(content.categories).toHaveLength(5);
  expect(fetchMock).not.toHaveBeenCalled();
});
