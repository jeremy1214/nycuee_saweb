import sourceDepartments from "./departments.json";
import departmentCards from "./departmentCards.json";

export interface DepartmentActivity {
  slug: string;
  name: string;
  image: string;
  detailImages?: string[];
  description: string[];
}

export interface DepartmentExperience {
  id: string;
  title: string;
  images: string[];
  content: string[];
}

export interface DepartmentData {
  title: string;
  bannerImage: string;
  groupPhotoImage: string;
  introParagraphs: string[];
  memberDescription: string;
  extraSidebarItems: { label: string; to?: string }[];
  activities: DepartmentActivity[];
  skills?: { mainTitle: string; subTitle: string; items: { title: string; content: string }[] };
  experiences?: DepartmentExperience[];
}

export const departments: Record<string, DepartmentData> = {
  ...sourceDepartments,
  activities: {
    title: departmentCards[0].name,
    bannerImage: departmentCards[0].image,
    groupPhotoImage: "",
    introParagraphs: [departmentCards[0].description],
    memberDescription: "",
    extraSidebarItems: [],
    activities: [],
  },
};

export { departmentCards };
export default departments;
