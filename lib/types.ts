export interface Person {
  id: string;
  name: string;
  company?: string;
  role?: string;
  type: "forced_to_socialize" | "probably_uses_glasses";
  imageUrl: string;
  location: string;
  easterImageUrl?: string;
  total: number;
  sr: number;
  total_temp?: number;
  SR_temp?: number;
  linkedinUrl: string;
}

export interface ComparisonPair {
  person1: Person;
  person2: Person;
  isFirstVisit: boolean;
  matchups?: Person[]; // Array de 10 personas (5 matcheos por percentil)
}
