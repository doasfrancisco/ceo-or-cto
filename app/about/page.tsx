"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fdfcfc] flex flex-col">
      <header className="bg-[#8c1d0a] text-white py-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-wider">CEO OR CTO</h1>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-10 text-center text-black">
        <p className="max-w-2xl text-lg md:text-xl leading-relaxed mb-10">
          Built by Francisco (
          <a
            href="https://twitter.com/doasfrancisco"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8c1d0a] font-semibold hover:underline"
          >
            @doasfrancisco
          </a>
          ) and Matias (
          <a
            href="https://twitter.com/MatiasAvendaoV1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8c1d0a] font-semibold hover:underline"
          >
            @MatiasAvendaoV1
          </a>
          ).
        </p>
        <p className="max-w-2xl text-lg md:text-xl leading-relaxed mb-6">
          Check source code on{" "}
          <a
            href="https://github.com/doasfrancisco/ceo-or-cto"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8c1d0a] font-semibold hover:underline"
          >
             Github (Click here)
          </a>
        </p>
        <Link href="/" className="text-[#8c1d0a] font-bold hover:underline mt-10">
          Go back
        </Link>
      </main>
    </div>
  );
}
