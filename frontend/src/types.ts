export interface Slide {
  eyebrow: string;
  title: string;
  description: string[];
}

export interface NewsItem {
  category: string;
  dateLabel: string;
  title: string;
  summary: string;
  artwork: "research" | "campus" | "student";
}

export interface CalendarEvent {
  date: string;
  title: string;
  type: "department" | "academic";
}

