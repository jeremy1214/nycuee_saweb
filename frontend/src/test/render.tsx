import { render as baseRender, type RenderOptions } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { PublicActivityContent } from '../../../shared/activity-content';
import { ActivityContentContext } from '../features/activities/data/ActivityContentProvider';
import { activities, activityCategories } from '../features/activities/data/activities';

/** Existing visual/route regression tests inject fixtures; API lifecycle tests use the real provider. */
export function render(ui: ReactNode, options: RenderOptions & { activityContent?: PublicActivityContent } = {}) {
  const { activityContent, wrapper: Wrapper, ...rest } = options;
  return baseRender(ui, { ...rest, wrapper: ({ children }) => {
    const data = activityContent ?? { activities, categories: activityCategories.map((category, order) => ({ ...category, order })) };
    return <ActivityContentContext.Provider value={{ status: 'ready', data, refresh: () => {} }}>
      {Wrapper ? <Wrapper>{children}</Wrapper> : children}
    </ActivityContentContext.Provider>;
  } });
}
