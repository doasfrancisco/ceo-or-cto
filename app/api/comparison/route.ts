import { NextRequest, NextResponse } from "next/server";
import { people, FIRST_VISIT_IDS } from "@/lib/data";
import { ComparisonPair } from "@/lib/types";

// Helper function to get random items from array
function getRandomPeople(count: number, location?: string) {
  let pool = people;

  // Filter by category if provided
  if (location && location !== "random") {
    pool = people.filter(p => p.location.toLowerCase() === location.toLowerCase());
  }

  // Shuffle and pick
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const isFirstVisit = searchParams.get("firstVisit") === "true";
  const category = searchParams.get("category") || "random";

  let person1, person2;

  if (isFirstVisit) {
    // Return the two specific images for first-time visitors
    person1 = people.find(p => p.id === FIRST_VISIT_IDS[0]);
    person2 = people.find(p => p.id === FIRST_VISIT_IDS[1]);

    if (!person1 || !person2) {
      return NextResponse.json(
        { error: "First visit images not found" },
        { status: 500 }
      );
    }
  } else {
    // Return two random images from the same category/bucket
    const randomPeople = getRandomPeople(2, category);

    if (randomPeople.length < 2) {
      return NextResponse.json(
        { error: "Not enough people in this category" },
        { status: 404 }
      );
    }

    [person1, person2] = randomPeople;
  }

  const response: ComparisonPair = {
    person1,
    person2,
    isFirstVisit,
  };

  return NextResponse.json(response);
}
