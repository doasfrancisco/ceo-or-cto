import { NextRequest, NextResponse } from "next/server";
import { getAllPeople, getPeopleByLocation, getPersonById, updatePersonStatsFromTemp } from "@/lib/cosmosdb";
import { ComparisonPair, Person } from "@/lib/types";

function applyEasterImage(person: Person): Person {
  const updatedPerson = person.easterImageUrl && Math.random() < 1/3
    ? { ...person, imageUrl: person.easterImageUrl }
    : person;

  // Initialize temp counters to 0
  return {
    ...updatedPerson,
    total_temp: 0,
    SR_temp: 0,
  };
}

function getMatchupsByPercentile(people: Person[]): Person[] {
  const ceos = people.filter(p => p.type === "forced_to_socialize");
  const ctos = people.filter(p => p.type === "probably_uses_glasses");

  if (ceos.length === 0 || ctos.length === 0) {
    const shuffled = [...people].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10).map(p => applyEasterImage(p));
  }

  // Ordenar cada arreglo por SR/Total_veces (descendente - mayor rating primero)
  const sortedCEOs = [...ceos].sort((a, b) => {
    const ratioA = Number(a.total) > 0 ? Number(a.sr) / Number(a.total) : 0;
    const ratioB = Number(b.total) > 0 ? Number(b.sr) / Number(b.total) : 0;
    return ratioB - ratioA;
  });

  const sortedCTOs = [...ctos].sort((a, b) => {
    const ratioA = Number(a.total) > 0 ? Number(a.sr) / Number(a.total) : 0;
    const ratioB = Number(b.total) > 0 ? Number(b.sr) / Number(b.total) : 0;
    return ratioB - ratioA;
  });

  // 5 percentiles para 5 matcheos (definiendo rangos)
  const percentileRanges = [
    { start: 0.0, end: 0.2 },
    { start: 0.2, end: 0.4 },
    { start: 0.4, end: 0.6 },
    { start: 0.6, end: 0.8 },
    { start: 0.8, end: 1.0 },
  ];
  const matchups: Person[] = [];

  // Seleccionar aleatoriamente una persona dentro del rango del percentil
  const getRandomPersonInPercentileRange = (
    sortedArray: Person[],
    startPercentile: number,
    endPercentile: number
  ): Person => {
    const startIndex = Math.floor((sortedArray.length - 1) * (1 - endPercentile));
    const endIndex = Math.floor((sortedArray.length - 1) * (1 - startPercentile));

    // Asegurar que los índices estén dentro de los límites
    const minIndex = Math.max(0, Math.min(startIndex, sortedArray.length - 1));
    const maxIndex = Math.max(0, Math.min(endIndex, sortedArray.length - 1));

    // Seleccionar aleatoriamente dentro del rango
    const randomIndex = minIndex + Math.floor(Math.random() * (maxIndex - minIndex + 1));
    return sortedArray[randomIndex];
  };

  // Para cada rango de percentil, seleccionar aleatoriamente un CEO y un CTO
  percentileRanges.forEach(range => {
    const ceo = getRandomPersonInPercentileRange(sortedCEOs, range.start, range.end);
    const cto = getRandomPersonInPercentileRange(sortedCTOs, range.start, range.end);
    matchups.push(applyEasterImage(ceo), applyEasterImage(cto));
  });

  return matchups;
}

export async function GET(request: NextRequest) {
  try {
    console.log("API route called - Environment check:", {
      hasEndpoint: !!process.env.COSMOS_DB_ENDPOINT,
      hasKey: !!process.env.COSMOS_DB_KEY,
      databaseId: process.env.COSMOS_DB_DATABASE_ID,
      containerId: process.env.COSMOS_DB_CONTAINER_ID
    });

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
    let matchups: Person[] | undefined;

    if (isFirstVisit) {
      person1 = await getPersonById('yo');
      person2 = await getPersonById('mati');

      console.log("First visit persons:", person1, person2);

      if (!person1 || !person2) {
        return NextResponse.json(
          { error: "First visit images not found" },
          { status: 500 }
        );
      }
    } else {
      let people: Person[];
      if (location && location !== "random") {
        people = await getPeopleByLocation(location);
      } else {
        people = await getAllPeople();
      }

      matchups = getMatchupsByPercentile(people);

      person1 = matchups[0];
      person2 = matchups[1];
    }

    const response: ComparisonPair = {
      person1,
      person2,
      isFirstVisit,
      matchups,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in comparison API:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: "Failed to fetch comparison data",
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { people } = body as { people: Person[] };

    if (!people || !Array.isArray(people)) {
      return NextResponse.json(
        { error: "Invalid request body. Expected array of people." },
        { status: 400 }
      );
    }

    // Update each person's stats in parallel
    const updatePromises = people.map(person =>
      updatePersonStatsFromTemp(
        person.id,
        Number(person.total_temp),
        Number(person.SR_temp)
      )
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, updated: people.length });
  } catch (error) {
    console.error("Error updating stats:", error);
    return NextResponse.json(
      { error: "Failed to update stats" },
      { status: 500 }
    );
  }
}
