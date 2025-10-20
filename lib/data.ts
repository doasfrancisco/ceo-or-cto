import { Person } from "./types";

// Mock data - replace with actual image URLs from your storage bucket
export const people: Person[] = [
  {
    id: "1",
    name: "Francisco Dominguez",
    company: "Maxilar",
    role: "CEO",
    type: "forced_to_socialize",
    imageUrl: "/yo.jpeg",
    location: "Peru",
  },
  {
    id: "2",
    name: "Matias Avendaño",
    company: "Maxilar",
    role: "CTO",
    type: "probably_has_glasses",
    imageUrl: "/mati.jpeg",
    location: "Peru",
  },
  {
    id: "3",
    name: "Diego Salazar",
    company: "Livo (Dead)",
    role: "CEO",
    type: "forced_to_socialize",
    imageUrl: "/diego.jpeg",
    location: "Peru",
  },
  {
    id: "4",
    name: "Miguel Huaman",
    company: "Livo (Dead)",
    role: "CTO",
    type: "probably_has_glasses",
    imageUrl: "/miguel_huaman.jpg",
    location: "Peru",
    easterImageUrl: "/baby_huaman.png"
  },
];

export const FIRST_VISIT_IDS = ["1", "2"];
