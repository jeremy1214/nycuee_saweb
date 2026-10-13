export interface Slide {
  image: string;
  imagePosition: string;
  eyebrow: string;
  title: string;
  description: string[];
}

export interface CalendarEvent {
  date: string;
  title: string;
  type: "department" | "academic";
}
