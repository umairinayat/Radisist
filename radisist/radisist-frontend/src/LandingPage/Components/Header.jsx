import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../../index.css";

const navItems = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Mission", to: "/mission" },
  { label: "Contact", to: "/contact" },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(localStorage.getItem("access_token"));

  const handleNavClick = (to) => {
    setMenuOpen(false);
    navigate(to);
  };

  const handleLoginClick = () => {
    setMenuOpen(false);
    navigate("/login");
  };

  const handleSignupClick = () => {
    setMenuOpen(false);
    navigate("/createaccount");
  };

  const handleDashboardClick = () => {
    setMenuOpen(false);
    navigate("/dashboard");
  };

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <nav
      data-nav-version="route-links-20260503"
      className={`relative flex h-20 items-center justify-between px-6 transition-all duration-300 sm:px-8 md:h-24 md:px-12 ${
        menuOpen ? "bg-[#6C1B36] shadow-none" : "bg-white"
      } lg:bg-white`}
    >
      <Link
        to="/"
        onClick={() => setMenuOpen(false)}
        className={`z-[60] text-2xl font-black transition-all duration-500 md:text-3xl ${
          menuOpen ? "fixed left-6 top-6 text-white" : "text-black"
        }`}
      >
        Radisist <span className="text-amber-500">.</span>
      </Link>

      <div className="hidden flex-1 items-center justify-between lg:flex">
        <ul className="mx-auto flex items-center justify-center gap-14 text-base font-medium lg:text-lg xl:gap-16">
          {navItems.map((item) => (
            <li key={item.to}>
              <button
                type="button"
                onClick={() => handleNavClick(item.to)}
                className={`relative cursor-pointer transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:w-full after:origin-left after:transition-transform after:duration-300 ${
                  location.pathname === item.to
                    ? "text-[#780F32] after:scale-x-100 after:bg-[#780F32]"
                    : "text-neutral-900 after:scale-x-0 after:bg-neutral-800 hover:after:scale-x-100"
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          {!isLoggedIn ? (
            <>
              <button
                onClick={handleLoginClick}
                className="group relative h-11 cursor-pointer overflow-hidden rounded-full bg-neutral-950 px-6 font-medium text-white transition-all duration-300 active:translate-y-[2px]"
              >
                <span className="relative z-10">Login</span>
                <span className="absolute inset-0 overflow-hidden rounded-full">
                  <span className="absolute left-0 aspect-square w-full origin-center -translate-x-full bg-[#3e3e3e] transition-all duration-500 group-hover:-translate-x-0 group-hover:scale-150"></span>
                </span>
              </button>

              <button
                onClick={handleSignupClick}
                className="group relative h-11 cursor-pointer overflow-hidden rounded-full border-2 border-black bg-white px-6 font-medium text-black transition-all duration-300 hover:text-white active:translate-y-[2px]"
              >
                <span className="relative z-10">Signup</span>
                <span className="absolute inset-0 overflow-hidden rounded-full">
                  <span className="absolute right-0 aspect-square w-full origin-center translate-x-full bg-black transition-all duration-500 group-hover:translate-x-0 group-hover:scale-150"></span>
                </span>
              </button>
            </>
          ) : (
            <button
              onClick={handleDashboardClick}
              className="group relative h-11 cursor-pointer overflow-hidden rounded-full bg-[#7B1E38] px-8 font-bold text-white shadow-lg shadow-[#7B1E38]/20 transition-all duration-300 active:translate-y-[2px]"
            >
              <span className="relative z-10 text-xs uppercase tracking-wider">
                Dashboard
              </span>
              <span className="absolute inset-0 overflow-hidden rounded-full">
                <span className="absolute left-0 aspect-square w-full origin-center -translate-x-full bg-[#651A34] transition-all duration-500 group-hover:-translate-x-0 group-hover:scale-150"></span>
              </span>
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        className="absolute right-6 z-[70] flex cursor-pointer flex-col gap-1 lg:hidden"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span
          className={`block h-[2px] w-6 transition-all duration-300 ${
            menuOpen ? "translate-y-[6px] rotate-45 bg-white" : "bg-black"
          }`}
        ></span>
        <span
          className={`block h-[2px] w-6 transition-all duration-300 ${
            menuOpen ? "opacity-0" : "bg-black"
          }`}
        ></span>
        <span
          className={`block h-[2px] w-6 transition-all duration-300 ${
            menuOpen ? "-translate-y-[6px] -rotate-45 bg-white" : "bg-black"
          }`}
        ></span>
      </button>

      <div
        className={`fixed left-0 top-0 z-50 flex h-full w-full flex-col justify-between bg-[#6C1B36] transition-all duration-500 ease-in-out ${
          menuOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-5 opacity-0 pointer-events-none"
        }`}
      >
        <ul className="flex flex-1 flex-col items-start justify-center gap-2 px-10 text-3xl font-medium text-white sm:gap-8 sm:text-4xl md:gap-10 md:px-20 md:text-5xl">
          {navItems.map((item) => (
            <li key={item.to} className="w-full rounded-xl px-12 py-3">
              <button
                type="button"
                onClick={() => handleNavClick(item.to)}
                className={`block cursor-pointer transition-colors ${
                  location.pathname === item.to ? "text-[#C9DCF6]" : "text-white"
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="mb-10 flex w-full flex-col gap-4 px-10 sm:gap-5 md:px-20">
          {!isLoggedIn ? (
            <>
              <button
                onClick={handleLoginClick}
                className="rounded-full bg-neutral-950 py-2 text-sm font-medium text-white transition-all hover:bg-[#1a1a1a] sm:py-5 sm:text-xl"
              >
                Login
              </button>
              <button
                onClick={handleSignupClick}
                className="rounded-full border-2 border-white py-2 text-sm text-white transition-all hover:bg-black sm:py-5 sm:text-xl"
              >
                Signup
              </button>
            </>
          ) : (
            <button
              onClick={handleDashboardClick}
              className="rounded-full bg-white py-2 text-sm font-black uppercase tracking-widest text-[#6C1B36] shadow-xl transition-all hover:bg-gray-100 sm:py-5 sm:text-xl"
            >
              Dashboard
            </button>
          )}
        </div>

        <div className="mb-8 text-center text-[12px] tracking-wide text-white opacity-80 sm:text-base md:text-lg">
          YOUR RADIOLOGY ASSISTANT
        </div>
      </div>
    </nav>
  );
}

export default Header;
