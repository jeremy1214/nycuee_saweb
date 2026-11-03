import type { TeamContent } from '../../../../shared/organization-content';
export type { TeamContent, ScheduleBlock } from '../../../../shared/organization-content';
export type TeamData = Omit<TeamContent, 'id' | 'order'>;
export interface TeamItem extends TeamData { key: string }
