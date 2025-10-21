"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { ComparisonPair, Person } from "@/lib/types";
import { analytics } from "@/lib/mixpanel";

export default function Home() {
  const [comparison, setComparison] = useState<ComparisonPair | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("random");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [otherPerson, setOtherPerson] = useState<Person | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicStartedRef = useRef(false);

  // Cache matchups and track current pair index
  const matchupsRef = useRef<Person[] | null>(null);
  const currentPairIndexRef = useRef<number>(0);

  const isFirstVisit = () => {
    if (typeof window === "undefined") return true;
    const hasVisited = localStorage.getItem("hasVisited");
    return !hasVisited;
  };

  const fetchNewMatchups = async (cat: string = category) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    try {
      const firstVisit = isFirstVisit();
      const response = await fetch(
        `/api/comparison?firstVisit=${firstVisit}&location=${cat}`,
        {
          cache: 'no-store',
          signal: abortController.signal
        }
      );

      const data: ComparisonPair = await response.json();

      if (!abortController.signal.aborted) {
        // Cache the matchups and increment index since we're showing the first pair
        if (data.matchups) {
          matchupsRef.current = data.matchups;
          currentPairIndexRef.current = 1; // Start at 1 since we're already showing pair 0
        }

        setComparison(data);

        if (firstVisit) {
          localStorage.setItem("hasVisited", "true");
          analytics.trackFirstVisit();
        }

        // Track comparison view
        analytics.trackComparisonView({
          person1Id: data.person1.id,
          person1Name: data.person1.name,
          person1Role: data.person1.role || '',
          person2Id: data.person2.id,
          person2Name: data.person2.name,
          person2Role: data.person2.role || '',
          category: cat,
          isFirstVisit: firstVisit,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
    } finally {
      // Only clear loading if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const updateStatsAndFetchNew = async () => {
    // Update stats in DB before fetching new matchups
    if (matchupsRef.current) {
      try {
        await fetch('/api/comparison', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ people: matchupsRef.current }),
        });
      } catch (error) {
        console.error('Failed to update stats:', error);
      }
    }

    // Fetch new matchups
    fetchNewMatchups();
  };

  const showNextPair = () => {
    if (!matchupsRef.current || currentPairIndexRef.current >= 5) {
      // Need to update stats and fetch new matchups
      updateStatsAndFetchNew();
      return;
    }

    // Get the next pair from cached matchups
    const pairIndex = currentPairIndexRef.current;
    const person1 = matchupsRef.current[pairIndex * 2];
    const person2 = matchupsRef.current[pairIndex * 2 + 1];

    // Safety check: if person1 or person2 is undefined, fetch new matchups
    if (!person1 || !person2) {
      console.error("Invalid matchup pair at index", pairIndex, "- fetching new matchups");
      updateStatsAndFetchNew();
      return;
    }

    // Increment for next time
    currentPairIndexRef.current += 1;

    // Create comparison object
    const newComparison: ComparisonPair = {
      person1,
      person2,
      isFirstVisit: false,
      matchups: matchupsRef.current,
    };

    setComparison(newComparison);

    // Track comparison view
    analytics.trackComparisonView({
      person1Id: person1.id,
      person1Name: person1.name,
      person1Role: person1.role || '',
      person2Id: person2.id,
      person2Name: person2.name,
      person2Role: person2.role || '',
      category,
      isFirstVisit: false,
    });
  };

  useEffect(() => {
    fetchNewMatchups();
  }, []);

  const handleSelect = (personId: string) => {
    // Start music on first click
    if (!musicStartedRef.current && audioRef.current) {
      audioRef.current.volume = 0.2;
      audioRef.current.play().catch((error) => {
        console.log("Failed to play audio:", error);
      });
      musicStartedRef.current = true;
    }

    // Track selection event and update temp stats
    if (comparison) {
      const selected = comparison.person1.id === personId ? comparison.person1 : comparison.person2;
      const other = comparison.person1.id === personId ? comparison.person2 : comparison.person1;

      const correct = selected.role === 'CTO';
      setIsCorrect(correct);
      setSelectedPerson(selected);
      setOtherPerson(other);
      setShowResult(true);

      if (matchupsRef.current) {
        matchupsRef.current = matchupsRef.current.map(person => {
          // if (!person.total_temp || !person.SR_temp) {
          //   person.total_temp = 0;
          //   person.SR_temp = 0;
          // }
          if (person.id === selected.id) {
            return {
              ...person,
              total_temp: person.total_temp! + 1,
              SR_temp: person.SR_temp! + 1,
            };
          } else if (person.id === other.id) {
            return {
              ...person,
              total_temp: person.total_temp! + 1,
            };
          }
          return person;
        });
      }

      analytics.trackSelection({
        selectedPersonId: selected.id,
        selectedPersonName: selected.name,
        selectedPersonRole: selected.role || '',
        otherPersonId: other.id,
        otherPersonName: other.name,
        otherPersonRole: other.role || '',
        category,
      });

      // Auto-advance after 2 seconds
      setTimeout(() => {
        setShowResult(false);
        setComparison(null);
        showNextPair();
      }, 2000);
    }
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    analytics.trackCategoryChange(newCategory);
    // Reset cache when category changes
    matchupsRef.current = null;
    currentPairIndexRef.current = 0;
    fetchNewMatchups(newCategory);
  };

  return (
    <div className="min-h-screen bg-[#fdfcfc] flex flex-col">
      {/* Background Music */}
      <audio
        ref={audioRef}
        src="/ceo-or-cto.mp3"
        loop
        autoPlay
        preload="auto"
        className="hidden"
      />

      {/* Header */}
      <header className="bg-[#8c1d0a] text-white py-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-wider">CEO OR CTO</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-5">
        {/* Tagline */}
        <div className="text-center mb-8">
          <p className="text-lg md:text-2xl font-bold text-black mb-12">
            Were we CTO for our looks? No. Will we be judged on them? Yes.
          </p>
          <p className="text-xl md:text-4xl font-bold text-black mt-4">
            Who&apos;s the CTO? Click to Choose.
          </p>
        </div>

        {/* Image Comparison Section */}
        <div className="flex flex-col items-center gap-4 mb-12">
          <div className="flex items-center gap-3 md:gap-4">
            {loading || !comparison ? (
              <>
                {/* Loading placeholders */}
                <div className="w-48 h-64 md:w-60 md:h-80 bg-[#8c1d0a] border-4 animate-pulse" />
                <div className="text-2xl md:text-3xl text-black">OR</div>
                <div className="w-48 h-64 md:w-60 md:h-80 bg-[#8c1d0a] border-4 animate-pulse" />
              </>
            ) : (
              <>
                {/* Left Image */}
                <button
                  className="group cursor-pointer"
                  onClick={() => handleSelect(comparison.person1.id)}
                >
                  <div className={`w-48 h-64 md:w-60 md:h-80 border-4 transition-colors overflow-hidden relative ${
                    showResult
                      ? (selectedPerson?.id === comparison.person1.id && isCorrect)
                        ? 'border-green-500 border-8'
                        : (selectedPerson?.id === comparison.person1.id && !isCorrect)
                        ? 'border-red-500 border-8'
                        : 'border-gray-400'
                      : 'hover:border-[#8c1d0a]'
                  }`}>
                    <Image
                      src={comparison.person1.imageUrl}
                      alt={comparison.person1.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </button>

                {/* OR Text */}
                <div className="text-2xl md:text-3xl text-black">OR</div>

                {/* Right Image */}
                <button
                  className="group cursor-pointer"
                  onClick={() => handleSelect(comparison.person2.id)}
                >
                  <div className={`w-48 h-64 md:w-60 md:h-80 border-4 transition-colors overflow-hidden relative ${
                    showResult
                      ? (selectedPerson?.id === comparison.person2.id && isCorrect)
                        ? 'border-green-500 border-8'
                        : (selectedPerson?.id === comparison.person2.id && !isCorrect)
                        ? 'border-red-500 border-8'
                        : 'border-gray-400'
                      : 'hover:border-[#8c1d0a]'
                  }`}>
                    <Image
                      src={comparison.person2.imageUrl}
                      alt={comparison.person2.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </button>
              </>
            )}
          </div>

          {/* Result Display */}
          {showResult && selectedPerson && otherPerson && comparison && (
            <div className="text-center mt-4">
              <p className={`text-2xl font-bold mb-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {isCorrect ? 'Good Job!' : 'Oops! Wrong Choice'}
              </p>
              <div className="flex gap-4 justify-center text-sm">
                <a
                  href={comparison.person1.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {comparison.person1.name} ({comparison.person1.role})
                </a>
                <span>vs</span>
                <a
                  href={comparison.person2.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {comparison.person2.name} ({comparison.person2.role})
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        {/* <nav className="mb-8">
          <ul className="flex flex-wrap justify-center gap-4 md:gap-6 text-[#4d9db5] font-bold">
            <li>
              <button
                onClick={() => handleCategoryChange("peru")}
                className="hover:underline uppercase"
              >
                Peru
              </button>
            </li>
            <li>
              <button
                onClick={() => handleCategoryChange("mexico")}
                className="hover:underline uppercase"
              >
                Mexico
              </button>
            </li>
            <li>
              <button
                onClick={() => handleCategoryChange("brazil")}
                className="hover:underline uppercase"
              >
                Brazil
              </button>
            </li>
            <li>
              <button
                onClick={() => handleCategoryChange("chile")}
                className="hover:underline uppercase"
              >
                Chile
              </button>
            </li>
            <li>
              <button
                onClick={() => handleCategoryChange("colombia")}
                className="hover:underline uppercase"
              >
                Colombia
              </button>
            </li>
            <li>
              <button
                onClick={() => handleCategoryChange("bolivia")}
                className="hover:underline uppercase"
              >
                Bolivia
              </button>
            </li>
            <li>
              <button
                onClick={() => handleCategoryChange("ecuador")}
                className="hover:underline uppercase"
              >
                Ecuador
              </button>
            </li>
            <li>
              <button
                onClick={() => handleCategoryChange("paraguay")}
                className="hover:underline uppercase"
              >
                Paraguay
              </button>
            </li>
            <li>
              <button
                onClick={() => handleCategoryChange("random")}
                className="hover:underline uppercase"
              >
                Random
              </button>
            </li>
          </ul>
        </nav> */}

        {/* Footer Links */}
        <footer className="flex gap-6 text-black font-bold">
          <a href="#" className="hover:underline">About</a>
          <a href="#" className="hover:underline">Rankings</a>
          {/* <a href="#" className="hover:underline">Previous</a> */}
        </footer>
      </main>
    </div>
  );
}