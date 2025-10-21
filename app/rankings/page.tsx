import type { Metadata } from "next";
import Link from "next/link";
import { getAllPeople } from "@/lib/cosmosdb";
import type { Person } from "@/lib/types";
import { useCallback } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rankings | CEO or CTO",
  description: "Top and bottom CTO rankings by SR/Total ratio.",
};

type RankedPerson = {
  person: Person;
  ratio: number;
};

const ratioFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-US");

function computeRatio(person: Person): number {
  const total = Number(person.total) || 0;
  const sr = Number(person.sr) || 0;
  if (total <= 0) return 0;
  return sr / total;
}

function rankPeople(people: Person[]): RankedPerson[] {
  return people.map(person => ({
    person,
    ratio: computeRatio(person),
  }));
}

function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return "0%";
  }
  return ratioFormatter.format(ratio);
}

async function fetchRankings(): Promise<RankedPerson[] | null> {
  try {
    const people = await getAllPeople();
    const ctos = people.filter(person => person.type === "probably_uses_glasses");
    if (!ctos.length) {
      return [];
    }
    return rankPeople(ctos);
  } catch (error) {
    console.error("Failed to load rankings from CosmosDB:", error);
    return null;
  }
}


function RankingColumn({
  title,
  data,
}: {
  title: string;
  data: RankedPerson[];
}) {

  const createSharePostUrl = useCallback((person: Person, index: number) => {
  const lines: string[] = [
    `@${person.id} you're ${index + 1}th on https://ceo-or-cto.com!`
  ];

  lines.push(` `);
  lines.push(`Linkedin: ${person.linkedInUrl}`);

  const encodedText = encodeURIComponent(lines.join("\n"));

  return `https://www.linkedin.com/feed/?shareActive&mini=true&text=${encodedText}`;
}, []);

  return (
    <section className="bg-white border border-[#8c1d0a]/20 rounded-xl shadow-sm p-6">
      <h2 className="text-xl md:text-2xl font-bold text-[#8c1d0a] mb-4 text-center">
        {title}
      </h2>
      <ol className="space-y-4">
        {data.map(({ person, ratio }, index) => (
          <li
            key={person.id}
            className="flex items-start gap-4 rounded-lg border border-[#8c1d0a]/10 px-4 py-3"
          >
            <span className="text-2xl font-bold text-[#8c1d0a]">{index + 1}.</span>
            <div className="flex-1">
              <a href={createSharePostUrl(person, index)} target="_blank" rel="noopener noreferrer" className="text-[#8c1d0a] font-semibold hover:underline">
                {person.name} (Click to tag)
              </a>              
              {person.company && (
                <p className="text-sm text-gray-600">
                  {person.role ? `${person.role} - ${person.company}` : person.company}
                </p>
              )}
              {!person.company && person.role && (
                <p className="text-sm text-gray-600">{person.role}</p>
              )}
              <div className="mt-2 text-sm text-gray-700">
                <p>SR: {numberFormatter.format(Number(person.sr) || 0)}</p>
                <p>Total: {numberFormatter.format(Number(person.total) || 0)}</p>
                <p className="font-medium text-[#8c1d0a]">
                  {formatRatio(ratio)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function RankingsPage() {
  const rankings = await fetchRankings();

  if (rankings === null) {
    return (
      <div className="min-h-screen bg-[#fdfcfc] flex flex-col">
        <header className="bg-[#8c1d0a] text-white py-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-wider">CEO OR CTO</h1>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4 text-center text-black gap-6">
          <h2 className="text-2xl md:text-3xl font-bold text-[#8c1d0a]">
            Rankings temporarily unavailable
          </h2>
          <p className="max-w-xl text-lg text-gray-700">
            We couldn&apos;t connect to CosmosDB right now. Please try again in a few moments.
          </p>
          <Link href="/" className="text-[#8c1d0a] font-semibold hover:underline">
            Return home
          </Link>
        </main>
      </div>
    );
  }

  if (!rankings.length) {
    return (
      <div className="min-h-screen bg-[#fdfcfc] flex flex-col">
        <header className="bg-[#8c1d0a] text-white py-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-wider">CEO OR CTO</h1>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4 text-center text-black gap-6">
          <h2 className="text-2xl md:text-3xl font-bold text-[#8c1d0a]">
            No CTO data found
          </h2>
          <p className="max-w-xl text-lg text-gray-700">
            We couldn&apos;t find CTO entries in CosmosDB. Add some data and check back soon.
          </p>
          <Link href="/" className="text-[#8c1d0a] font-semibold hover:underline">
            Return home
          </Link>
        </main>
      </div>
    );
  }

  const topFive = [...rankings]
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 5);

  const bottomFive = [...rankings]
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#fdfcfc] flex flex-col">
      <header className="bg-[#8c1d0a] text-white py-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-wider">CEO OR CTO</h1>
      </header>
      <main className="flex-1 px-4 py-10 md:px-10 text-black">
        <div className="max-w-5xl mx-auto">

          <div className="flex justify-center w-full">
            <RankingColumn title="The most CTOs" data={topFive} />
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/" className="text-[#8c1d0a] font-semibold hover:underline">
              Go back
            </Link>
          </div>
        </div>
      </main>
      <footer className="flex gap-6 text-black font-bold justify-center py-6">
        <Link href="/about" className="hover:underline">About</Link>
      </footer>
    </div>
  );
}
