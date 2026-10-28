import { parsePublicActivityContent } from '../../../../../shared/activity-content';

export async function loadActivityContent(signal: AbortSignal) {
  const source = import.meta.env.VITE_ACTIVITY_SOURCE ?? 'api';
  if (source === 'json') {
    const legacy = await import('virtual:legacy-activity-content');
    return parsePublicActivityContent(legacy.default);
  }
  if (source !== 'api') throw new Error('VITE_ACTIVITY_SOURCE 必須是 api 或 json。');
  let response: Response;
  try { response = await fetch('/api/v1/public/activity-content', { signal, cache: 'no-store', credentials: 'same-origin' }); }
  catch (error) {
    if (signal.aborted) throw error;
    throw new Error('目前無法連線至活動服務，請稍後重試。');
  }
  if (!response.ok) throw new Error('目前無法載入活動資料，請稍後重試。');
  try { return parsePublicActivityContent(await response.json()); }
  catch { throw new Error('活動資料回應格式不正確，請稍後重試。'); }
}
