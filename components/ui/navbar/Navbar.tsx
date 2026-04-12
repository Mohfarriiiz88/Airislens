"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Airis", href: "/airis" },
  { name: "FindFG", href: "/findfg" },
  { name: "Gallery", href: "/gallery" },
];

type NavbarTone = "light" | "dark";

function getLinkClass(pathname: string, href: string, mobile = false, dark = false) {
  const baseClass = mobile
    ? "block rounded-full px-4 py-3 text-lg transition-colors"
    : "transition-colors duration-200";

  if (pathname === href) {
    return `${baseClass} ${dark ? "text-black" : "text-white"}`;
  }

  return `${baseClass} ${
    dark ? "text-black/70 hover:text-black" : "text-white/75 hover:text-white"
  }`;
}

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [desktopTone, setDesktopTone] = useState<NavbarTone>("light");

  useEffect(() => {
    const updateScrollState = () => {
      setIsScrolled(window.scrollY > 12);
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrollState);
    };
  }, []);

  useEffect(() => {
    const themedSections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-navbar-tone]")
    );
    let frameId = 0;

    if (themedSections.length === 0) {
      frameId = window.requestAnimationFrame(() => {
        setDesktopTone("light");
      });

      return () => {
        cancelAnimationFrame(frameId);
      };
    }

    const updateDesktopTone = () => {
      const probeOffset = 96;
      let nextTone: NavbarTone =
        themedSections[0].dataset.navbarTone === "dark" ? "dark" : "light";

      for (const section of themedSections) {
        const sectionTone =
          section.dataset.navbarTone === "dark" ? "dark" : "light";
        const rect = section.getBoundingClientRect();

        if (rect.top <= probeOffset && rect.bottom > probeOffset) {
          nextTone = sectionTone;
          break;
        }

        if (rect.top <= probeOffset) {
          nextTone = sectionTone;
        }
      }

      setDesktopTone((currentTone) =>
        currentTone === nextTone ? currentTone : nextTone
      );
    };

    const requestDesktopToneUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateDesktopTone);
    };

    requestDesktopToneUpdate();
    window.addEventListener("scroll", requestDesktopToneUpdate, { passive: true });
    window.addEventListener("resize", requestDesktopToneUpdate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", requestDesktopToneUpdate);
      window.removeEventListener("resize", requestDesktopToneUpdate);
    };
  }, [pathname]);

  const mobileHeaderClass = isScrolled
    ? "bg-white/85 shadow-[0_12px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl"
    : "bg-transparent";
  const mobileIconClass = isScrolled ? "bg-black" : "bg-white";
  const mobileLogoClass = isScrolled ? "brightness-0" : "";
  const mobileMenuClass = isScrolled
    ? "border-black/10 bg-white/95 text-black shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
    : "border-white/15 bg-black/95 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]";
  const isDesktopDark = desktopTone === "dark";
  const desktopLogoClass = isDesktopDark ? "brightness-0" : "";

  return (
    <header className="fixed inset-x-0 top-0 z-[9999]">
      <div
        className={`flex items-center justify-between px-6 py-5 transition-all duration-300 md:px-8 md:bg-transparent md:shadow-none md:backdrop-blur-none ${mobileHeaderClass}`}
      >
        <Link href="/" className="relative z-[10002] flex items-center">
          <Image
            src="/svg/logo.svg"
            alt="AirisLens Logo"
            width={50}
            height={10}
            className={`object-contain transition duration-300 md:hidden ${mobileLogoClass}`}
            priority
          />
          <Image
            src="/svg/logo.svg"
            alt="AirisLens Logo"
            width={50}
            height={10}
            className={`hidden object-contain transition duration-300 md:block ${desktopLogoClass}`}
            priority
          />
        </Link>

        <nav className="hidden items-center gap-10 text-[20px] font-normal md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={getLinkClass(pathname, item.href, false, isDesktopDark)}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="relative md:hidden">
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="relative z-[10002] flex touch-manipulation flex-col gap-1.5"
          >
            <span
              className={`h-[2px] w-6 transition-transform duration-200 ${mobileIconClass} ${
                isMenuOpen ? "translate-y-[8px] rotate-45" : ""
              }`}
            />
            <span
              className={`h-[2px] w-6 transition-opacity duration-200 ${mobileIconClass} ${
                isMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`h-[2px] w-6 transition-transform duration-200 ${mobileIconClass} ${
                isMenuOpen ? "-translate-y-[8px] -rotate-45" : ""
              }`}
            />
          </button>

          {isMenuOpen ? (
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[9997] bg-black/45"
            />
          ) : null}

          <nav
            id="mobile-nav-menu"
            className={`fixed inset-x-4 top-[88px] z-[10001] rounded-[28px] border p-4 backdrop-blur-xl transition-all duration-300 ${
              isMenuOpen
                ? "visible translate-y-0 opacity-100"
                : "invisible -translate-y-2 opacity-0 pointer-events-none"
            } ${mobileMenuClass}`}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={getLinkClass(pathname, item.href, true, isScrolled)}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
