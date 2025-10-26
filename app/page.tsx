"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ComparisonPair, Person, ComparisonVariant } from "@/lib/types";
import { analytics } from "@/lib/mixpanel";
import { FIRST_COMPARISON } from "@/lib/firstVisit";

const CACHE_VERSION = "v2";
const SPONSORED_FLAG_KEY = "hasSeenSponsoredComparisons";
const getCacheKey = (cat: string, variant: ComparisonVariant) => `comparisonCache:${CACHE_VERSION}:${variant}:${cat}`;

type CachedComparisonPayload = {
  timestamp: number;
  variant: ComparisonVariant;
  data: ComparisonPair;
};

export default function Home() {
  const [comparison, setComparison] = useState<ComparisonPair | null>(null);
  const [loading, setLoading] = useState(true);
  const [category] = useState("random");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [otherPerson, setOtherPerson] = useState<Person | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicStartedRef = useRef(false);

  // Cache matchups and track current pair index
  const matchupsRef = useRef<Person[] | null>(null);
  const currentPairIndexRef = useRef<number>(0);
  const preloadedImagesRef = useRef<Set<string>>(new Set());
  const prefetchedComparisonRef = useRef<ComparisonPair | null>(null);
  const prefetchInFlightRef = useRef(false);
  const prefetchAbortControllerRef = useRef<AbortController | null>(null);
  const prefetchPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    analytics.ensureIdentity();
    if (typeof navigator !== "undefined") {
      const userAgent = navigator.userAgent || "";
      setIsMobileDevice(/android|iphone|ipad|ipod|mobile/i.test(userAgent));
    }
  }, []);

  const readComparisonFromCache = useCallback((cat: string, variant: ComparisonVariant): ComparisonPair | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(getCacheKey(cat, variant));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedComparisonPayload;
      if (parsed?.variant && parsed.variant !== variant) {
        return null;
      }
      if (!parsed?.data?.person1 || !parsed?.data?.person2) {
        return null;
      }
      return {
        ...parsed.data,
        variant: parsed.variant ?? variant,
      };
    } catch (error) {
      console.warn("Failed to read cached comparison:", error);
      localStorage.removeItem(getCacheKey(cat, variant));
      return null;
    }
  }, []);

  const writeComparisonToCache = useCallback((cat: string, data: ComparisonPair, variant: ComparisonVariant) => {
    if (typeof window === "undefined") return;
    try {
      const normalizedData: ComparisonPair = {
        ...data,
        variant,
      };
      const payload: CachedComparisonPayload = {
        timestamp: Date.now(),
        data: normalizedData,
        variant,
      };
      localStorage.setItem(getCacheKey(cat, variant), JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to cache comparison data:", error);
    }
  }, []);

  const markFirstVisitComplete = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("hasVisited", "true");
    analytics.trackFirstVisit();
  }, []);

  const markSponsoredVisitComplete = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SPONSORED_FLAG_KEY, "true");
  }, []);

  const hasSeenSponsoredComparisons = useCallback(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SPONSORED_FLAG_KEY) === "true";
  }, []);

  const createLinkedInShareUrl = useCallback((person: Person) => {
    const roleText = person.role ? person.role : "CTO";
    const lines: string[] = [];

    if (isMobileDevice) {
      lines.push(`@doasfrancisco @${person.id} eres el ${roleText} en CEO or CTO `);
      lines.push(`https://www.linkedin.com/in/${person.id}/`);

      const mobileEncoded = encodeURIComponent(lines.join("\n"));
      const mobileShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${mobileEncoded}`;
      return mobileShareUrl;

    } else {
      lines.push(`@doasfrancisco @${person.id} eres el ${roleText} en https://ceo-or-cto.com`);
      lines.push(" ");
      lines.push(person.linkedInUrl);
      const desktopEncoded = encodeURIComponent(lines.join("\n"));
      const desktopShareUrl = `https://www.linkedin.com/feed/?shareActive&mini=true&text=${desktopEncoded}`;
      return desktopShareUrl;
    }
  }, [isMobileDevice]);

  const preloadImage = (url?: string | null) => {
    if (!url || typeof window === "undefined") return;
    if (preloadedImagesRef.current.has(url)) return;

    const img = new window.Image();
    img.src = url;
    preloadedImagesRef.current.add(url);
  };

  const reportMissingImage = useCallback((person: Person) => {
    if (typeof window === "undefined") return;

    try {
      void fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "missing-image-url",
          timestamp: Date.now(),
          person,
        }),
      }).catch(error => {
        console.warn("Failed to report missing image:", error);
      });
    } catch (error) {
      console.warn("Failed to report missing image:", error);
    }
  }, []);

  const preloadPersonImages = useCallback((people: Person[]) => {
    if (!people || people.length === 0) return;

    people.forEach(person => {
      if (!person || !person.imageUrl) {
        reportMissingImage(person);
      }

      preloadImage(person.imageUrl);
      preloadImage(person.easterImageUrl ?? null);
    });
  }, [reportMissingImage]);

  const prefetchNextBatch = useCallback((cat: string = category) => {
    if (prefetchInFlightRef.current || prefetchedComparisonRef.current) return;

    if (prefetchAbortControllerRef.current) {
      prefetchAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    prefetchAbortControllerRef.current = controller;
    prefetchInFlightRef.current = true;

    const promise = fetch(
      `/api/comparison?firstVisit=false&variant=default&location=${cat}`,
      {
        cache: "no-store",
        signal: controller.signal,
      }
    )
      .then(async response => {
        const data: ComparisonPair = await response.json();

        if (!controller.signal.aborted) {
          const responseVariant: ComparisonVariant = data.variant ?? "default";
          const normalizedData: ComparisonPair = {
            ...data,
            isFirstVisit: responseVariant === "firstVisit",
            variant: responseVariant,
          };

          prefetchedComparisonRef.current = normalizedData;
          writeComparisonToCache(cat, normalizedData, responseVariant);

          if (normalizedData.matchups) {
            preloadPersonImages(normalizedData.matchups);
          }
          preloadPersonImages([normalizedData.person1, normalizedData.person2]);
        }
      })
      .catch(error => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error("Prefetch comparison failed:", error);
      })
      .finally(() => {
        if (prefetchAbortControllerRef.current === controller) {
          prefetchInFlightRef.current = false;
          prefetchAbortControllerRef.current = null;
        }
      });

    prefetchPromiseRef.current = promise;
    return promise;
  }, [category, preloadPersonImages, writeComparisonToCache]);

  const maybePrefetchNextBatch = useCallback((cat: string = category) => {
    if (!matchupsRef.current || prefetchedComparisonRef.current || prefetchInFlightRef.current) {
      return;
    }

    const totalPairs = Math.floor(matchupsRef.current.length / 2);
    const shownPairs = currentPairIndexRef.current;
    const remainingPairs = totalPairs - shownPairs;

    if (remainingPairs <= 2) {
      prefetchNextBatch(cat);
    }
  }, [category, prefetchNextBatch]);

  const applyComparison = useCallback((
    data: ComparisonPair,
    cat: string,
    options: { firstVisit: boolean; variant: ComparisonVariant }
  ) => {
    if (options.variant === "sponsored") {
      markSponsoredVisitComplete();
    }

    if (data.matchups) {
      matchupsRef.current = data.matchups;
      currentPairIndexRef.current = 1;
      preloadPersonImages(data.matchups);
    } else {
      matchupsRef.current = null;
      currentPairIndexRef.current = 0;
    }

    preloadPersonImages([data.person1, data.person2]);
    setComparison({
      ...data,
      isFirstVisit: options.firstVisit,
      variant: options.variant,
    });

    analytics.trackComparisonView({
      person1Id: data.person1.id,
      person1Name: data.person1.name,
      person1Role: data.person1.role || "",
      person2Id: data.person2.id,
      person2Name: data.person2.name,
      person2Role: data.person2.role || "",
      category: cat,
      isFirstVisit: options.firstVisit,
      variant: options.variant,
    });

    maybePrefetchNextBatch(cat);
  }, [markSponsoredVisitComplete, maybePrefetchNextBatch, preloadPersonImages]);

  const isFirstVisit = useCallback(() => {
    if (typeof window === "undefined") return true;
    const hasVisited = localStorage.getItem("hasVisited");
    return !hasVisited;
  }, []);

  const fetchNewMatchups = useCallback(async (cat: string = category) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    prefetchedComparisonRef.current = null;
    prefetchPromiseRef.current = null;
    if (prefetchAbortControllerRef.current) {
      prefetchAbortControllerRef.current.abort();
      prefetchAbortControllerRef.current = null;
    }
    prefetchInFlightRef.current = false;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const firstVisit = isFirstVisit();
    const sponsoredPending = !hasSeenSponsoredComparisons();
    const variant: ComparisonVariant = firstVisit
      ? "firstVisit"
      : sponsoredPending
        ? "sponsored"
        : "default";
    let servedFromCache = false;

    let cachedComparison = readComparisonFromCache(cat, variant);
    if (variant === "firstVisit" && cachedComparison && cachedComparison.isFirstVisit !== true) {
      // Ignore stale cache entries from previous sessions when forcing the intro matchup.
      cachedComparison = null;
    }
    if (!cachedComparison && variant === "firstVisit") {
      const baseFirstVisit: ComparisonPair = {
        ...FIRST_COMPARISON,
        isFirstVisit: true,
        variant,
      };
      const randomizedFirstVisit =
        Math.random() < 0.5
          ? {
              ...baseFirstVisit,
              person1: baseFirstVisit.person2,
              person2: baseFirstVisit.person1,
            }
          : baseFirstVisit;
      cachedComparison = randomizedFirstVisit;
      writeComparisonToCache(cat, randomizedFirstVisit, variant);
    }

    if (cachedComparison) {
      servedFromCache = true;
      const cachedVariant = cachedComparison.variant ?? variant;
      setLoading(false);
      applyComparison(cachedComparison, cat, {
        firstVisit: cachedVariant === "firstVisit",
        variant: cachedVariant,
      });
      if (cachedVariant === "firstVisit") {
        markFirstVisitComplete();
      }
    } else {
      setLoading(true);
    }

    try {
      const shouldRequestFirstVisit = variant === "firstVisit" && !servedFromCache;
      const shouldRequestSponsored = variant === "sponsored" && !servedFromCache;
      const requestVariant: ComparisonVariant = shouldRequestFirstVisit
        ? "firstVisit"
        : shouldRequestSponsored
          ? "sponsored"
          : "default";

      const params = new URLSearchParams({
        location: cat,
        variant: requestVariant,
      });

      if (shouldRequestFirstVisit) {
        params.set("firstVisit", "true");
      }

      const response = await fetch(
        `/api/comparison?${params.toString()}`,
        {
          cache: "no-store",
          signal: abortController.signal,
        }
      );

      const data: ComparisonPair = await response.json();
      if (abortController.signal.aborted) {
        return;
      }

      const responseVariant: ComparisonVariant =
        data.variant ?? requestVariant;

      const normalizedData: ComparisonPair = {
        ...data,
        isFirstVisit: responseVariant === "firstVisit",
        variant: responseVariant,
      };

      writeComparisonToCache(cat, normalizedData, responseVariant);

      if (!servedFromCache) {
        if (responseVariant === "firstVisit") {
          markFirstVisitComplete();
        } else if (responseVariant === "sponsored") {
          markSponsoredVisitComplete();
        } else if (variant === "sponsored") {
          markSponsoredVisitComplete();
        }

        applyComparison(normalizedData, cat, {
          firstVisit: responseVariant === "firstVisit",
          variant: responseVariant,
        });
        setLoading(false);
      } else {
        prefetchedComparisonRef.current = normalizedData;
        if (normalizedData.matchups) {
          preloadPersonImages(normalizedData.matchups);
        }
        preloadPersonImages([normalizedData.person1, normalizedData.person2]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Failed to fetch comparison:", error);
      if (!servedFromCache && !abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [
    applyComparison,
    category,
    hasSeenSponsoredComparisons,
    isFirstVisit,
    markFirstVisitComplete,
    markSponsoredVisitComplete,
    preloadPersonImages,
    readComparisonFromCache,
    writeComparisonToCache,
  ]);

  const updateStatsAndFetchNew = async () => {
    const peopleToUpdate = matchupsRef.current
      ? matchupsRef.current.map(person => ({ ...person }))
      : null;

    // Reset current cache before fetching new data
    matchupsRef.current = null;
    currentPairIndexRef.current = 0;

    if (peopleToUpdate) {
      fetch('/api/comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ people: peopleToUpdate }),
      }).catch(error => {
        console.error('Failed to update stats:', error);
      });
    }

    const consumePrefetchedComparison = () => {
      const prefetched = prefetchedComparisonRef.current;
      if (!prefetched) return false;

      prefetchedComparisonRef.current = null;
      prefetchPromiseRef.current = null;
      setLoading(false);
      const prefetchedVariant = prefetched.variant ?? "default";
      applyComparison(prefetched, category, {
        firstVisit: prefetchedVariant === "firstVisit",
        variant: prefetchedVariant,
      });
      return true;
    };

    if (consumePrefetchedComparison()) {
      return;
    }

    if (prefetchPromiseRef.current) {
      try {
        await prefetchPromiseRef.current;
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Prefetch resolution failed:', error);
        }
      } finally {
        prefetchPromiseRef.current = null;
      }
    }

    if (consumePrefetchedComparison()) {
      return;
    }

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

    const currentVariant = comparison?.variant ?? "default";

    // Create comparison object
    const newComparison: ComparisonPair = {
      person1,
      person2,
      isFirstVisit: false,
      matchups: matchupsRef.current,
      variant: currentVariant,
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
      variant: currentVariant,
    });

    maybePrefetchNextBatch(category);
  };

  useEffect(() => {
    fetchNewMatchups();
  }, [fetchNewMatchups]);

  const handleReset = () => {
    setScore(0);
    setGameOver(false);
    setShowResult(false);
    setComparison(null);
    setSelectedPerson(null);
    setOtherPerson(null);
    matchupsRef.current = null;
    currentPairIndexRef.current = 0;
    prefetchedComparisonRef.current = null;
    fetchNewMatchups();
  };

  const handleSelect = (personId: string) => {
    if (showResult || !comparison) {
      return;
    }

    // Start music on first click
    if (!musicStartedRef.current && audioRef.current) {
      audioRef.current.volume = 0.2;
      audioRef.current.play().catch((error) => {
        console.log("Failed to play audio:", error);
      });
      musicStartedRef.current = true;
    }

    // Track selection event and update temp stats
    const selected = comparison.person1.id === personId ? comparison.person1 : comparison.person2;
    const other = comparison.person1.id === personId ? comparison.person2 : comparison.person1;

    const correct = selected.type === 'probably_uses_glasses';
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
      variant: comparison.variant ?? "default",
    });

    // If correct, increment score and auto-advance after 2 seconds
    // If incorrect, show game over screen after 2 seconds
    if (correct) {
      setScore(prevScore => prevScore + 1);
      setTimeout(() => {
        setShowResult(false);
        setComparison(null);
        showNextPair();
      }, 2000);
    } else {
      setTimeout(() => {
        setGameOver(true);
      }, 2000);
    }
  };

  const sponsorName =
    comparison?.person1.sponsorName ?? comparison?.person2.sponsorName ?? null;
  const sponsorUrl =
    comparison?.person1.sponsorUrl ?? comparison?.person2.sponsorUrl ?? null;

  const isSponsoredComparison = Boolean(
    comparison &&
    (comparison.variant === "sponsored" ||
      comparison.person1.sponsored ||
      comparison.person2.sponsored)
  );

  const renderSponsorText = (className: string) => {
    if (sponsorUrl) {
      const baseClasses = className
        ? `${className} hover:underline`
        : "hover:underline";
      return (
        <a
          href={sponsorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={baseClasses}
        >
          Sponsored by {sponsorName}
        </a>
      );
    }

    return (
      <span className={className}>
        Sponsored by {sponsorName}
      </span>
    );
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
        <h1 className="text-2xl md:text-5xl font-bold tracking-wider">CEO OR CTO</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-5 relative">
        {/* Game Over Screen Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-[#fdfcfc] flex items-center justify-center z-50">
            <div className="bg-white border-4 border-[#8c1d0a] rounded-lg shadow-2xl p-8 md:p-12 max-w-md mx-4 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-[#8c1d0a] mb-4">
                Game Over!
              </h2>
              <p className="text-md text-gray-600 mb-2">
                {score === 0 ? "Better luck next time!" : score === 1 ? "Not bad for a first try!" : score < 5 ? "Keep practicing!" : score < 10 ? "Pretty good!" : "Amazing streak!"}
              </p>
              <p className="text-4xl md:text-5xl font-bold text-black my-6">
                Score: {score}
              </p>
              <p className="text-lg md:text-xl text-gray-700 mb-6">
                Desafía y compártelo a tus amigos!
              </p>
              <button
                onClick={handleReset}
                className="bg-[#8c1d0a] text-white px-8 py-3 rounded-lg text-lg font-bold hover:bg-[#6d1508] transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Tagline */}
        <div className="text-center mb-8">
          <p className="text-lg md:text-2xl font-bold text-black mb-12">
            Were we CTO for our looks? No.
            <br className="block md:hidden" />
            <span className="md:ml-2">Will we be judged on them? Yes.</span>
          </p>
          <p className="text-xl md:text-4xl font-bold text-black mt-4">
            Who&apos;s the CTO? CLICK to choose.
          </p>
          {/* Score Display */}
          <div className="mt-6">
            {isSponsoredComparison ? (
              <>
                {renderSponsorText("md:hidden text-lg font-bold text-[#8c1d0a]")}
                <p className="hidden md:block text-lg md:text-2xl font-bold text-[#8c1d0a]">
                  Current Streak: {score}
                </p>
              </>
            ) : (
              <p className="text-lg md:text-2xl font-bold text-[#8c1d0a]">
                Current Streak: {score}
              </p>
            )}
          </div>
        </div>

        {/* Image Comparison Section */}
        <div className="relative flex flex-col items-center gap-4 mb-12">
          {isSponsoredComparison && (
            <div className="hidden md:block absolute top-1/4 -left-6 -translate-x-full">
              <div className="px-4 py-3 max-w-xs text-center">
                {renderSponsorText("text-lg font-semibold text-[#8c1d0a]")}
              </div>
            </div>
          )}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 md:gap-4">
            {loading || !comparison ? (
              <>
                {/* Loading placeholders */}
                <div className="w-36 h-56 md:w-60 md:h-80 bg-[#8c1d0a] border-4 animate-pulse" />
                <div className="text-2xl md:text-3xl text-black">OR</div>
                <div className="w-36 h-56 md:w-60 md:h-80 bg-[#8c1d0a] border-4 animate-pulse" />
              </>
            ) : (
              <>
                {/* Left Image */}
                <button
                  className="group cursor-pointer"
                  onClick={() => handleSelect(comparison.person1.id)}
                  disabled={showResult}
                >
                  <div className={`w-36 h-56 md:w-60 md:h-80 border-4 transition-colors overflow-hidden relative ${
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
                  disabled={showResult}
                >
                  <div className={`w-36 h-56 md:w-60 md:h-80 border-4 transition-colors overflow-hidden relative ${
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
            <div className="w-full mt-4 min-h-[60px] md:min-h-[90px] flex flex-col items-center justify-center">
              {showResult && selectedPerson && otherPerson && comparison && (
                <div className="text-center">
                  <p className={`text-2xl font-bold mb-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {isCorrect ? 'Correct!' : 'Wrong'}
                  </p>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center justify-items-center gap-4 md:gap-6 text-sm md:text-base w-full max-w-2xl mx-auto px-2">
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="font-medium whitespace-normal break-words leading-tight">
                        {comparison.person1.name} ({comparison.person1.role})
                      </span>
                      <a
                        href={createLinkedInShareUrl(comparison.person1)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline whitespace-normal break-words leading-tight"
                        title={`Share ${comparison.person1.name} on LinkedIn`}
                      >
                        LinkedIn (Click to tag)
                      </a>
                    </div>
                    <span className="w-10 text-center font-semibold">vs</span>
                    <div className="flex flex-col items-start gap-1 text-left">
                      <span className="font-medium whitespace-normal break-words leading-tight">
                        {comparison.person2.name} ({comparison.person2.role})
                      </span>
                      <a
                        href={createLinkedInShareUrl(comparison.person2)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline whitespace-normal break-words leading-tight"
                        title={`Share ${comparison.person2.name} on LinkedIn`}
                      >
                        LinkedIn (Click to tag)
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
        <footer className="flex gap-6 text-black font-bold justify-center">
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/rankings" className="hover:underline">Rankings</Link>
          {/* <a href="#" className="hover:underline">Previous</a> */}
        </footer>
      </main>
    </div>
  );
}

