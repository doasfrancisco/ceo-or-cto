export interface Person {
  id: string;
  name: string;
  company?: string;
  role?: string;
  type: "forced_to_socialize" | "probably_uses_glasses";
  imageUrl: string;
  location: string;
  easterImageUrl?: string;
}

export interface ComparisonPair {
  person1: Person;
  person2: Person;
  isFirstVisit: boolean;
}
