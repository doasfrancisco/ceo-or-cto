import { NextRequest, NextResponse } from "next/server";
import { people, FIRST_VISIT_IDS } from "@/lib/data";
import { ComparisonPair, Person } from "@/lib/types";

function applyEasterImage(person: Person): Person {
  if (person.easterImageUrl && Math.random() < 1/3) {
    return {
      ...person,
      imageUrl: person.easterImageUrl,
    };
  }
  return person;
}

function getRandomPeople(location?: string): [Person, Person] {
  let pool = people;

  if (location && location !== "random") {
    pool = people.filter(p => p.location.toLowerCase() === location.toLowerCase());
  }

  const ceos = pool.filter(p => p.type === "forced_to_socialize");
  const ctos = pool.filter(p => p.type === "probably_has_glasses");

  if (ceos.length === 0 || ctos.length === 0) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return [applyEasterImage(shuffled[0]), applyEasterImage(shuffled[1])];
  }

  const randomCEO = ceos[Math.floor(Math.random() * ceos.length)];
  const randomCTO = ctos[Math.floor(Math.random() * ctos.length)];

  return [applyEasterImage(randomCEO), applyEasterImage(randomCTO)];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const isFirstVisit = searchParams.get("firstVisit") === "true";
  let location = searchParams.get("location") || "random";

  if (location === "random") {
    const country = request.headers.get("x-vercel-ip-country") ||
                   request.headers.get("cf-ipcountry");

    const countryToLocation: Record<string, string> = {
      "PE": "Peru",
      "MX": "Mexico",
      "BR": "Brazil",
      "CL": "Chile",
      "CO": "Colombia",
      "BO": "Bolivia",
      "EC": "Ecuador",
      "PY": "Paraguay",
    };

    if (country && countryToLocation[country]) {
      location = countryToLocation[country];
    }
  }

  let person1, person2;

  if (isFirstVisit) {
    person1 = people.find(p => p.id === FIRST_VISIT_IDS[0]);
    person2 = people.find(p => p.id === FIRST_VISIT_IDS[1]);

    if (!person1 || !person2) {
      return NextResponse.json(
        { error: "First visit images not found" },
        { status: 500 }
      );
    }
  } else {
    [person1, person2] = getRandomPeople(location);
  }

  const response: ComparisonPair = {
    person1,
    person2,
    isFirstVisit,
  };

  return NextResponse.json(response);
}
