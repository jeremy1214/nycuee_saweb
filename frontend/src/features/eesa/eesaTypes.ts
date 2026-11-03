import type { DepartmentContent, ImageValue } from '../../../../shared/organization-content';
export type { DepartmentContent, DepartmentActivity, DepartmentExperience } from '../../../../shared/organization-content';
export type DepartmentData = Omit<DepartmentContent, 'id' | 'order' | 'nameEn' | 'cardImage' | 'cardDescription'>;
export interface DepartmentCard { name: string; nameEn: string; description: string; image: ImageValue; link: string }
