export default function Home() {
  return (
    <div className="min-h-screen bg-[#9fa8a3] flex flex-col">
      {/* Header */}
      <header className="bg-[#8b3a3a] text-white py-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-wider">CEO OR CTO</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Tagline */}
        <div className="text-center mb-8">
          <p className="text-lg md:text-xl font-semibold text-black mb-2">
            Were we let in for our looks? No. Will we be judged on them? Yes.
          </p>
          <p className="text-xl md:text-2xl font-bold text-black mt-4">
            Who&apos;s the CTO? Click to Choose.
          </p>
        </div>

        {/* Image Comparison Section */}
        <div className="flex items-center gap-6 md:gap-12 mb-12">
          {/* Left Image */}
          <button className="group cursor-pointer">
            <div className="w-48 h-64 md:w-64 md:h-80 bg-[#8b9a8a] border-4 border-[#6b7a6a] hover:border-[#4b5a4a] transition-colors flex items-center justify-center">
              <span className="text-white text-sm opacity-60">Click to Select</span>
            </div>
          </button>

          {/* OR Text */}
          <div className="text-2xl md:text-3xl font-bold text-black">OR</div>

          {/* Right Image */}
          <button className="group cursor-pointer">
            <div className="w-48 h-64 md:w-64 md:h-80 bg-[#8b9a8a] border-4 border-[#6b7a6a] hover:border-[#4b5a4a] transition-colors flex items-center justify-center">
              <span className="text-white text-sm opacity-60">Click to Select</span>
            </div>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="mb-8">
          <ul className="flex flex-wrap justify-center gap-4 md:gap-6 text-[#2c5f6f] font-semibold">
            <li><a href="#" className="hover:underline uppercase">Peru</a></li>
            <li><a href="#" className="hover:underline uppercase">Mexico</a></li>
            <li><a href="#" className="hover:underline uppercase">Brazil</a></li>
            <li><a href="#" className="hover:underline uppercase">Chile</a></li>
            <li><a href="#" className="hover:underline uppercase">Colombia</a></li>
            <li><a href="#" className="hover:underline uppercase">Bolivia</a></li>
            <li><a href="#" className="hover:underline uppercase">Ecuador</a></li>
            <li><a href="#" className="hover:underline uppercase">Paraguay</a></li>
            <li><a href="#" className="hover:underline uppercase">Random</a></li>
          </ul>
        </nav>

        {/* Footer Links */}
        <footer className="flex gap-6 text-black font-medium">
          <a href="#" className="hover:underline">About</a>
          <a href="#" className="hover:underline">Rankings</a>
          {/* <a href="#" className="hover:underline">Previous</a> */}
        </footer>
      </main>
    </div>
  );
}
