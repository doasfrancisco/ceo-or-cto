import { NextRequest, NextResponse } from "next/server";
import { getAllPeople, getPeopleByLocation, getPersonById } from "@/lib/cosmosdb";
import { FIRST_VISIT_IDS } from "@/lib/data";
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

function getRandomPeople(people: Person[]): [Person, Person] {
  const ceos = people.filter(p => p.type === "forced_to_socialize");
  const ctos = people.filter(p => p.type === "probably_uses_glasses");

  if (ceos.length === 0 || ctos.length === 0) {
    const shuffled = [...people].sort(() => Math.random() - 0.5);
    return [applyEasterImage(shuffled[0]), applyEasterImage(shuffled[1])];
  }

  const randomCEO = ceos[Math.floor(Math.random() * ceos.length)];
  const randomCTO = ctos[Math.floor(Math.random() * ctos.length)];

  return [applyEasterImage(randomCEO), applyEasterImage(randomCTO)];
}

export async function GET(request: NextRequest) {
  try {
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
      person1 = await getPersonById(FIRST_VISIT_IDS[0]);
      person2 = await getPersonById(FIRST_VISIT_IDS[1]);

      if (!person1 || !person2) {
        return NextResponse.json(
          { error: "First visit images not found" },
          { status: 500 }
        );
      }
    } else {
      // Fetch people from CosmosDB
      let people: Person[];
      if (location && location !== "random") {
        people = await getPeopleByLocation(location);
      } else {
        people = await getAllPeople();
      }

      if (people.length < 2) {
        return NextResponse.json(
          { error: "Not enough people in database" },
          { status: 500 }
        );
      }

      [person1, person2] = getRandomPeople(people);
    }

    const response: ComparisonPair = {
      person1,
      person2,
      isFirstVisit,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in comparison API:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparison data" },
      { status: 500 }
    );
  }
}
