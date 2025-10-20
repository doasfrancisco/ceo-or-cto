import { NextRequest, NextResponse } from "next/server";
import { getAllPeople, getPeopleByLocation, getPersonById } from "@/lib/cosmosdb";
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

function getMatchupsByPercentile(people: Person[]): Person[] {
  // Separar por tipo
  const ceos = people.filter(p => p.type === "forced_to_socialize");
  const ctos = people.filter(p => p.type === "probably_uses_glasses");

  if (ceos.length === 0 || ctos.length === 0) {
    const shuffled = [...people].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10).map(p => applyEasterImage(p));
  }

  // Ordenar cada arreglo por SR/Total_veces (descendente - mayor rating primero)
  const sortedCEOs = [...ceos].sort((a, b) => {
    const ratioA = Number(a.total_veces) > 0 ? Number(a.SR) / Number(a.total_veces) : 0;
    const ratioB = Number(b.total_veces) > 0 ? Number(b.SR) / Number(b.total_veces) : 0;
    return ratioB - ratioA;
  });

  const sortedCTOs = [...ctos].sort((a, b) => {
    const ratioA = Number(a.total_veces) > 0 ? Number(a.SR) / Number(a.total_veces) : 0;
    const ratioB = Number(b.total_veces) > 0 ? Number(b.SR) / Number(b.total_veces) : 0;
    return ratioB - ratioA;
  });

  // 5 percentiles para 5 matcheos
  const percentiles = [0.2, 0.4, 0.6, 0.8, 1.0];
  const matchups: Person[] = [];

  // Calcular el índice basado en el percentil
  const getPersonAtPercentile = (sortedArray: Person[], percentile: number): Person => {
    const index = Math.floor((sortedArray.length - 1) * (1 - percentile));
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  };

  // Para cada percentil, seleccionar un CEO y un CTO
  percentiles.forEach(percentile => {
    const ceo = getPersonAtPercentile(sortedCEOs, percentile);
    const cto = getPersonAtPercentile(sortedCTOs, percentile);
    matchups.push(applyEasterImage(ceo), applyEasterImage(cto));
  });

  return matchups;
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
      // Fetch people from CosmosDB
      let people: Person[];
      if (location && location !== "random") {
        people = await getPeopleByLocation(location);
      } else {
        people = await getAllPeople();
      }

      if (people.length < 10) {
        return NextResponse.json(
          { error: "Not enough people in database for matchups" },
          { status: 500 }
        );
      }

      // Obtener 10 personas (5 matcheos) organizados por percentiles
      matchups = getMatchupsByPercentile(people);

      // person1 y person2 son los primeros del matchup para compatibilidad
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
    return NextResponse.json(
      { error: "Failed to fetch comparison data" },
      { status: 500 }
    );
  }
}
