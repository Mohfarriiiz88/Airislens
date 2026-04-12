export default function StyleSection() {
  return (
    <section data-navbar-tone="dark" className="py-24 bg-white">
      
      <div className="max-w-[1500px] mx-auto px-6 md:px-20">
        
        <div className="
          flex flex-col gap-10
          md:flex-row md:justify-between md:items-start
        ">
          
          {/* LEFT TITLE */}
          <h2 className="text-[28px] md:text-[40px] text-black leading-tight max-w-[400px]">
            Your Perfect Style<br />
            Starts Here
          </h2>

          {/* RIGHT TEXT */}
          <p className="text-[18px] md:text-[24px] text-black max-w-[600px] leading-relaxed">
            Finding the right photography style is more than just choosing a look—it’s about expressing who you are and how you want your moments to be remembered. With the right style, every detail becomes more meaningful, every emotion feels more alive, and every photo tells a story that truly represents you.
          </p>

        </div>

      </div>
    </section>
  );
}
