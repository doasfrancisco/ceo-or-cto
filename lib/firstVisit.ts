import { ComparisonPair, Person } from "./types";

const francisco: Person = {
  id: "doasfrancisco",
  name: "Francisco Dominguez",
  company: "Maxilar",
  role: "CEO",
  type: "forced_to_socialize",
  imageUrl: "/ceos/yo.jpg",
  location: "Peru",
  total: 1,
  sr: 1,
  linkedInUrl: "https://www.linkedin.com/in/doasfrancisco",
  total_temp: 0,
  SR_temp: 0,
};

const matias: Person = {
  id: "matiasavenda222",
  name: "Matias Avendaño",
  company: "Maxilar",
  role: "CTO",
  type: "probably_uses_glasses",
  imageUrl: "/ctos/mati.jpg",
  location: "Peru",
  total: 1,
  sr: 1,
  linkedInUrl: "https://www.linkedin.com/in/matiasavenda222/",
  total_temp: 0,
  SR_temp: 0,
};

export const FIRST_COMPARISON: ComparisonPair = {
  person1: francisco,
  person2: matias,
  isFirstVisit: true,
};