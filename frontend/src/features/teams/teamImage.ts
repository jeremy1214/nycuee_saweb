import { imageSrc, type ImageValue } from '../../../../shared/organization-content';
export function teamImage(value: ImageValue | null): ImageValue | null {
  if (typeof value === 'string') return value && !value.startsWith('/') ? `/team/${value}` : value;
  return value;
}
export const getTeamImage = (value: ImageValue | null) => imageSrc(teamImage(value)) || undefined;
