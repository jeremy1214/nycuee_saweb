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

export interface DepartmentContent extends DepartmentData {
  id: string;
  order: number;
  nameEn: string;
  cardImage: string;
  cardDescription: string;
}

export interface DepartmentCard {
  name: string;
  nameEn: string;
  description: string;
  image: string;
  link: string;
}
