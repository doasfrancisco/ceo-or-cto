"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { ComparisonPair } from "@/lib/types";

export default function Home() {
  const [comparison, setComparison] = useState<ComparisonPair | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("random");

  const abortControllerRef = useRef<AbortController | null>(null);

  const isFirstVisit = () => {
    if (typeof window === "undefined") return true;
    const hasVisited = localStorage.getItem("hasVisited");
    return !hasVisited;
  };

  const fetchComparison = async (cat: string = category) => {
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
        setComparison(data);

        if (firstVisit) {
          localStorage.setItem("hasVisited", "true");
        }
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

  useEffect(() => {
    fetchComparison();
  }, []);

  const handleSelect = (personId: string) => {
    // TODO: Send selection to backend for ranking
    console.log("Selected person:", personId);

    setComparison(null);
    fetchComparison();
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    fetchComparison(newCategory);
  };

  return (
    <div className="min-h-screen bg-[#fdfcfc] flex flex-col">
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
        <div className="flex items-center gap-3 md:gap-4 mb-12">
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
                <div className="w-48 h-64 md:w-60 md:h-80 border-4 hover:border-[#8c1d0a] transition-colors overflow-hidden relative">
                  <Image
                    src={comparison.person1.imageUrl}
                    alt={comparison.person1.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 left-0 bg-black/50 text-white text-xs p-1">
                    {comparison.person1.name}
                    {comparison.person1.imageUrl}
                  </div>
                </div>
              </button>

              {/* OR Text */}
              <div className="text-2xl md:text-3xl text-black">OR</div>

              {/* Right Image */}
              <button
                className="group cursor-pointer"
                onClick={() => handleSelect(comparison.person2.id)}
              >
                <div className="w-48 h-64 md:w-60 md:h-80 border-4 hover:border-[#8c1d0a] transition-colors overflow-hidden relative">
                  <Image
                    src={comparison.person2.imageUrl}
                    alt={comparison.person2.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 left-0 bg-black/50 text-white text-xs p-1">
                    {comparison.person2.name}
                    {comparison.person2.imageUrl}
                  </div>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="mb-8">
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
        </nav>

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