"use client";
import SplitText from "@/components/ui/animation/SplitText";
export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      {" "}
      {/* BACKGROUND */}{" "}
      <img
        src="/svg/bghero.svg"
        alt="hero"
        className="absolute inset-0 w-full h-full object-cover"
      />{" "}
      {/* BLUR GLASS */}{" "}
      <div className="absolute left-0 top-0 h-full w-2/6 md:w-2/6 z-10 bg-white/5 backdrop-blur-[20px]" />{" "}
      {/* BIG TITLE */}{" "}
      <div className="absolute bottom-5 md:-bottom-10 left-0 z-20 px-6 md:px-16 pb-6">
        {" "}
        <h1 className="text-white font-primary leading-none tracking-[-0.02em] text-[80px] sm:text-[130px] md:text-[150px] lg:text-[170px] xl:text-[190px]">
          {" "}
          {/* AIRIS */}{" "}
          <SplitText
            text="Airis"
            tag="span"
            className="inline-block"
            delay={40}
            duration={1}
            splitType="chars"
            from={{ opacity: 0, y: 80 }}
            to={{ opacity: 1, y: 0 }}
            textAlign="left"
          />{" "}
          {/* LENS */}{" "}
          <span className="text-white ml-2 inline-block">
            {" "}
            <SplitText
              text="Lens"
              tag="span"
              className="inline-block"
              delay={40}
              duration={1}
              splitType="chars"
              from={{ opacity: 0, y: 80 }}
              to={{ opacity: 1, y: 0 }}
              textAlign="left"
            />{" "}
          </span>{" "}
        </h1>{" "}
      </div>{" "}
      {/* RIGHT TEXT - HEADLINE */}{" "}
      <div className=" absolute top-110 md:top-60 right-0 md:right-10 -translate-y-1/2 z-20 w-full flex justify-end px-6 md:px-12">
        {" "}
        <div className="max-w-xs md:max-w-sm text-right md:text-left">
          {" "}
          <SplitText
            text="Capture Your Perfect Moment with the Best Photographers"
            tag="p"
            className="text-[18px] md:text-[24px] italic font-normal text-white leading-[1.4]"
            delay={30}
            duration={1}
            splitType="lines"
            from={{ opacity: 0, y: 30 }}
            to={{ opacity: 1, y: 0 }}
            textAlign="inherit"
          />{" "}
        </div>{" "}
      </div>{" "}
      <div className="absolute bottom-60 md:bottom-60 -right-6 md:right-40 -translate-y-1/2 z-20 w-full flex justify-end px-12">
        {" "}
        <div className="max-w-xs md:max-w-sm text-right md:text-left">
          {" "}
          <SplitText
            text="Airis connects you with top professional photographers in Tegal for every special occasion."
            tag="p"
            className="text-[18px] md:text-[24px] font-normal text-white leading-[1.4]"
            delay={20}
            duration={1}
            splitType="lines"
            from={{ opacity: 0, y: 30 }}
            to={{ opacity: 1, y: 0 }}
            textAlign="inherit"
          />{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
