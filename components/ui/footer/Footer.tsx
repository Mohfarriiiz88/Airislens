export default function Footer() {
  return (
    <footer className="bg-[#0b0b0b] text-white py-20 relative overflow-hidden">
      
      <div className="max-w-[1500px] mx-auto px-6 md:px-20">
        
        {/* TOP QUOTE */}
        <div className="flex justify-end mb-16">
          <p className="text-[16px] md:text-[20px] text-white/70 max-w-[400px] text-right">
            "Capturing Moments, Crafting Stories"
          </p>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-24">
          
          {/* SERVICES */}
          <div>
            <p className="text-white/40 text-sm mb-4">SERVICES</p>
            <ul className="space-y-2 text-[18px]">
              <li>Wedding Photography</li>
              <li>Prewedding</li>
              <li>Event Coverage</li>
              <li>Product Shoot</li>
              <li>Graduation</li>
            </ul>
          </div>

          {/* PHOTOGRAPHERS */}
          <div>
            <p className="text-white/40 text-sm mb-4">PHOTOGRAPHERS</p>
            <ul className="space-y-2 text-[18px]">
              <li>Top Rated FG</li>
              <li>New Talents</li>
              <li>Verified Professionals</li>
              <li>By Location</li>
            </ul>
          </div>

          {/* BOOKING */}
          <div>
            <p className="text-white/40 text-sm mb-4">BOOKING</p>
            <ul className="space-y-2 text-[18px]">
              <li>Find Photographer</li>
              <li>Instant Booking</li>
              <li>Custom Request</li>
              <li>Pricing</li>
            </ul>
          </div>

          {/* RESOURCES */}
          <div>
            <p className="text-white/40 text-sm mb-4">RESOURCES</p>
            <ul className="space-y-2 text-[18px]">
              <li>Photography Guide</li>
              <li>Style Inspiration</li>
              <li>Tips & Tricks</li>
              <li>Blog</li>
            </ul>
          </div>

          {/* COMPANY */}
          <div>
            <p className="text-white/40 text-sm mb-4">COMPANY</p>
            <ul className="space-y-2 text-[18px]">
              <li>About Airis</li>
              <li>Careers</li>
              <li>Partnership</li>
              <li>Contact</li>
            </ul>
          </div>

        </div>

        {/* BOTTOM AREA */}
        <div className="flex justify-between items-end">
          
          {/* LEFT COPYRIGHT */}
          <p className="text-white/40 text-sm">
            © AirisLens 2026. All rights reserved.
          </p>

          {/* RIGHT LOGO */}
          <h1 className="text-[80px] md:text-[190px] font-light leading-none text-white/90">
            AirisLens
          </h1>

        </div>

      </div>

    </footer>
  );
}