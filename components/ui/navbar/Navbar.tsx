"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { name: "Home", href: "/" },
  { name: "FindFG", href: "/findfg" },
  { name: "Gallery", href: "/profile  " },
  { name: "Partner", href: "/partner" },
];

type NavbarTone = "light" | "dark";
type NavbarUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

function getLinkClass(
  pathname: string,
  href: string,
  mobile = false,
  dark = false
) {
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
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [desktopTone, setDesktopTone] = useState<NavbarTone>("light");
  const [user, setUser] = useState<NavbarUser | null>(null);

  // ================= SCROLL DETECT =================
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

  // ================= 🔥 SCROLL LOCK =================
  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const scrollY = window.scrollY;
    const { body, documentElement } = document;

    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyLeft = body.style.left;
    const previousBodyRight = body.style.right;
    const previousBodyWidth = body.style.width;
    const previousHtmlOverflow = documentElement.style.overflow;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.left = previousBodyLeft;
      body.style.right = previousBodyRight;
      body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isMenuOpen]);

  // ================= NAVBAR TONE =================
  useEffect(() => {
    const isDesktopViewport = window.matchMedia("(min-width: 768px)").matches;
    const themedSections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-navbar-tone]")
    );
    let frameId = 0;

    if (!isDesktopViewport || themedSections.length === 0) {
      frameId = window.requestAnimationFrame(() => {
        setDesktopTone("light");
      });

      return () => cancelAnimationFrame(frameId);
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

      setDesktopTone((prev) => (prev === nextTone ? prev : nextTone));
    };

    const requestUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateDesktopTone);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (isMounted) {
            setUser(null);
          }
          return;
        }

        const data = (await response.json()) as {
          user?: NavbarUser;
        };

        if (isMounted) {
          setUser(data.user ?? null);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const mobileHeaderClass = isScrolled
    ? "bg-white/85 shadow-[0_12px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl"
    : "bg-transparent";

  const mobileIconClass = isScrolled ? "bg-black" : "bg-white";
  const mobileLogoClass = isScrolled ? "brightness-0" : "";

  const isDesktopDark = desktopTone === "dark";
  const desktopLogoClass = isDesktopDark ? "brightness-0" : "";
  const accountHref = user ? "/profile" : "/login";
  const accountLabel = user ? user.name : "Login";

  function handleMobileAccountClick() {
    setIsMenuOpen(false);
    router.push(accountHref);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-[9999]">
      <div
        className={`flex items-center justify-between px-6 py-5 transition-all duration-300 md:px-8 ${mobileHeaderClass}`}
      >
        {/* LOGO */}
        <Link href="/" className="relative z-[10002] flex items-center">
          <Image
            src="/svg/logo.svg"
            alt="AirisLens Logo"
            width={50}
            height={50}
            className={`h-6 w-auto object-contain md:hidden ${mobileLogoClass}`}
            priority
          />
          <Image
            src="/svg/logo.svg"
            alt="AirisLens Logo"
            width={50}
            height={50}
            className={`hidden h-6 w-auto object-contain md:block ${desktopLogoClass}`}
            priority
          />
        </Link>

        {/* DESKTOP NAV */}
        <div className="hidden items-center gap-8 md:flex">
          <nav className="flex items-center gap-10 text-[20px] font-normal">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={getLinkClass(
                  pathname,
                  item.href,
                  false,
                  isDesktopDark
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <Link
            href={accountHref}
            className={`
              max-w-[220px] truncate px-5 py-2 rounded-full text-[18px] transition-all
              ${
                isDesktopDark
                  ? "bg-black text-white hover:bg-black/80"
                  : "bg-white text-black hover:bg-white/80"
              }
            `}
          >
            {accountLabel}
          </Link>
        </div>

        {/* MOBILE MENU */}
        <div className="relative md:hidden">
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="relative z-[10002] flex flex-col gap-1.5"
          >
            <span
              className={`h-[2px] w-6 ${mobileIconClass} ${
                isMenuOpen ? "translate-y-[8px] rotate-45" : ""
              }`}
            />
            <span
              className={`h-[2px] w-6 ${mobileIconClass} ${
                isMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`h-[2px] w-6 ${mobileIconClass} ${
                isMenuOpen ? "-translate-y-[8px] -rotate-45" : ""
              }`}
            />
          </button>

          {/* FULLSCREEN MENU */}
          <nav
            className={`fixed inset-0 z-[10001] flex flex-col justify-center items-center bg-white/90 backdrop-blur-xl transition-all duration-300 ${
              isMenuOpen
                ? "visible opacity-100"
                : "invisible opacity-0 pointer-events-none"
            }`}
          >
            <div className="flex flex-col items-center gap-6 text-[24px]">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-black transition hover:opacity-70"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <button
              onClick={handleMobileAccountClick}
              className="mt-10 max-w-[260px] truncate rounded-full bg-black px-6 py-3 text-[18px] text-white transition hover:bg-black/80"
            >
              {accountLabel}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
