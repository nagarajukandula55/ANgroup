"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Wrench,
  Warehouse,
  Palette,
  Factory,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import Logo from "./Logo";

/* -------------------------------------------------------------------- */
/* Data                                                                  */
/* -------------------------------------------------------------------- */

const VERTICALS = [
  {
    icon: ShoppingBag,
    title: "Retail & E-Commerce",
    description:
      "A native storefront and marketplace experience for brands that want to sell directly to customers online.",
  },
  {
    icon: Wrench,
    title: "Repair & Service Centers",
    description:
      "End-to-end job-sheet, appointment and CRM tooling for service-driven businesses managing repairs at scale.",
  },
  {
    icon: Warehouse,
    title: "B2B Wholesale & Distribution",
    description:
      "A dedicated partner portal for distributors and retailers to browse catalogs, place orders and track fulfillment.",
  },
  {
    icon: Palette,
    title: "Design & Branding Studio",
    description:
      "Creative and brand-identity services for businesses that need professional design without an in-house team.",
  },
  {
    icon: Factory,
    title: "Manufacturing & Warehouse",
    description:
      "Inventory, production and warehouse management modules built for businesses that make and move physical goods.",
  },
];

// Placeholder figures — replace with real, verified numbers before launch.
const STATS = [
  { value: "5+", label: "Business Verticals" },
  { value: "100+", label: "Businesses Powered" },
  { value: "1,000+", label: "Products Managed" },
  { value: "24/7", label: "Platform Availability" },
];

const NAV_LINKS = [
  { href: "#verticals", label: "Business Verticals" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

/* -------------------------------------------------------------------- */
/* Motion helpers                                                        */
/* -------------------------------------------------------------------- */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

/* -------------------------------------------------------------------- */
/* Component                                                             */
/* -------------------------------------------------------------------- */

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* ---------------------------------------------------------- Nav */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[var(--surface)]/90 backdrop-blur-md shadow-[var(--shadow)] border-b border-[var(--border)]"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Logo />

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[var(--text-2)] transition-colors hover:text-[var(--text)]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:block">
            <Link
              href="/login"
              className="inline-flex items-center rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-fg)] shadow-sm transition-colors hover:bg-[var(--primary-hover)]"
            >
              Login
            </Link>
          </div>

          <button
            className="md:hidden"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4 md:hidden">
            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium text-[var(--text-2)]"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-fg)]"
              >
                Login
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* --------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 md:pt-28">
        {/* Subtle ambient shapes for dynamism */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[var(--surface-3)]"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-40 h-72 w-72 rounded-full bg-[var(--surface-3)] opacity-70"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        <div className="container relative mx-auto max-w-4xl text-center">
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-4xl font-bold leading-tight tracking-tight md:text-6xl"
          >
            Powering Every Business
            <br className="hidden md:block" /> Under One Group
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-[var(--text-2)]"
          >
            AN Group is a unified enterprise platform bringing retail,
            service, wholesale, design and manufacturing businesses together
            under one operating system — built for scale, designed for
            simplicity.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-7 py-3.5 text-base font-semibold text-[var(--primary-fg)] shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5 hover:bg-[var(--primary-hover)]"
            >
              Get Started
              <ArrowRight size={18} />
            </Link>
            <a
              href="#verticals"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-7 py-3.5 text-base font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-3)]"
            >
              Explore Our Businesses
            </a>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------ What We Do */}
      <section id="verticals" className="px-6 py-24">
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              What We Do
            </h2>
            <p className="mt-4 text-[var(--text-2)]">
              A single platform, built to run every kind of business AN
              Group operates — each vertical powered by purpose-built
              tools.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {VERTICALS.map((v, i) => {
              const Icon = v.icon;
              return (
                <motion.div
                  key={v.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={fadeUp}
                  transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
                  className="card p-7 transition-shadow hover:shadow-[var(--shadow-lg)]"
                >
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-3)]">
                    <Icon size={22} strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-semibold">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                    {v.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Stats */}
      <section id="about" className="border-y border-[var(--border)] bg-[var(--surface)] px-6 py-16">
        <div className="container mx-auto grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              {/* Placeholder figure — replace with a real, verified number. */}
              <div className="text-3xl font-bold tracking-tight md:text-4xl">
                {s.value}
              </div>
              <div className="mt-2 text-sm text-[var(--text-3)]">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ CTA */}
      <section className="px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="container mx-auto max-w-3xl rounded-[28px] bg-[var(--primary)] px-8 py-14 text-center text-[var(--primary-fg)]"
        >
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to bring your business onto AN Group?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Sign in to manage your business, or reach out to explore how
            AN Group can support what you build next.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-[var(--primary)] transition-transform hover:-translate-y-0.5"
            >
              Login to Your Account
              <ArrowRight size={18} />
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Contact Us
            </a>
          </div>
        </motion.div>
      </section>

      {/* --------------------------------------------------- Footer */}
      <footer id="contact" className="border-t border-[var(--border)] px-6 py-14">
        <div className="container mx-auto grid grid-cols-1 gap-10 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-[var(--text-2)]">
              A unified enterprise platform powering every business under
              the AN Group umbrella.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--text)]">
              Company
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-[var(--text-2)]">
              <li><a href="#about" className="hover:text-[var(--text)]">About</a></li>
              <li><a href="#verticals" className="hover:text-[var(--text)]">Business Verticals</a></li>
              <li><Link href="/vendor-apply" className="hover:text-[var(--text)]">Become a Partner</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--text)]">
              Legal
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-[var(--text-2)]">
              <li><a href="#" className="hover:text-[var(--text)]">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[var(--text)]">Terms of Service</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--text)]">
              Contact
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-[var(--text-2)]">
              <li>hello@angroup.in</li>
              <li>
                <Link href="/login" className="hover:text-[var(--text)]">
                  Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="container mx-auto mt-12 border-t border-[var(--border)] pt-6 text-center text-xs text-[var(--text-3)]">
          &copy; {year} AN Group. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
