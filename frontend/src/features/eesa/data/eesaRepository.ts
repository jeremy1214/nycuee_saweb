import type { DepartmentCard, DepartmentContent, DepartmentData } from "../eesaTypes";

const modules = import.meta.glob<DepartmentContent>("../../../content/eesa/departments/*.json", { eager: true, import: "default" });
const content = Object.values(modules).sort((a, b) => a.order - b.order);

export const departments: Record<string, DepartmentData> = Object.fromEntries(content.map((department) => [department.id, department]));
export const departmentCards: DepartmentCard[] = content.map((department) => ({
  name: department.title,
  nameEn: department.nameEn,
  description: department.cardDescription,
  image: department.cardImage,
  link: `/eesa/${department.id}`,
}));
