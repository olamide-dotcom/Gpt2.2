import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bitcoin,
  Eye,
  HardDrive,
  PieChart,
  Rocket,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Wallet,
  Zap,
} from "lucide-react";

export interface NavLinkItem {
  label: string;
  href: string;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface StepItem {
  icon: LucideIcon;
  num: number;
  title: string;
  desc: string;
}

export type StrategyId = "conservative-growth" | "balanced-portfolio" | "aggressive-growth";

export interface StrategyItem {
  id: StrategyId;
  icon: LucideIcon;
  title: string;
  profile: string;
  desc: string;
  items: string[];
  featured?: boolean;
  fit: string;
  reviewCadence: string;
}

export interface WhyChooseUsItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface FundingItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface SecurityItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface FAQItem {
  q: string;
  a: string;
}

export const navLinks: NavLinkItem[] = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Why People Start Here", href: "#why-choose-us" },
  { label: "Trading Styles", href: "#strategies" },
];

export const heroStats: HeroStat[] = [
  { value: "$5", label: "STARTER BONUS" },
  { value: "+10%", label: "DEPOSIT BONUS" },
  { value: "4 steps", label: "ACCOUNT SETUP" },
  { value: "4 tokens", label: "FUNDING OPTIONS" },
];

export const steps: StepItem[] = [
  {
    icon: UserPlus,
    num: 1,
    title: "Create Your Account",
    desc: "Open your account and complete the short setup so your progress, funding access, and AI trade room stay tied to you.",
  },
  {
    icon: Wallet,
    num: 2,
    title: "Verify Your Details",
    desc: "Confirm your identity and account details so your funding page and starter balance can be prepared safely.",
  },
  {
    icon: PieChart,
    num: 3,
    title: "Pick Your Trading Style",
    desc: "Choose how quickly the AI bot should react as it tracks newly launched coins, early hype, and pullbacks.",
  },
  {
    icon: BarChart3,
    num: 4,
    title: "Unlock Funding And Bonus",
    desc: "Once your account is approved, your funding page opens, your $5 starter balance appears, and every approved deposit gets an extra 10%.",
  },
];

export const whyChooseUsItems: WhyChooseUsItem[] = [
  {
    icon: Zap,
    title: "Easy To Start",
    desc: "The experience keeps setup, funding, and trading in one clear flow so you always know what to do next.",
  },
  {
    icon: Eye,
    title: "Clear Bot View",
    desc: "Watch your AI trade room, funding progress, and bot movement without digging through confusing screens.",
  },
  {
    icon: ShieldCheck,
    title: "Guided Verification",
    desc: "Your account setup walks you through the right steps so approval, bonus access, and funding all happen in order.",
  },
  {
    icon: Wallet,
    title: "Starter Bonus First",
    desc: "After approval you receive a $5 starter balance to start the AI bot, then every approved deposit adds an extra 10% when you fund your account.",
  },
];

export const strategies: StrategyItem[] = [
  {
    id: "conservative-growth",
    icon: Shield,
    title: "Steady Accumulate",
    profile: "Track: Lower volatility",
    desc: "A calmer style that waits for stronger confirmation after a fresh listing goes live.",
    items: [
      "Lower trade frequency",
      "Extra signal confirmation",
      "Capital protection bias",
      "Weekly strategy review",
    ],
    fit: "Best if you want a slower pace and more breathing room while learning the flow.",
    reviewCadence: "Weekly updates and slower balance changes.",
  },
  {
    id: "balanced-portfolio",
    icon: BarChart3,
    title: "Hybrid Insider Flow",
    profile: "Track: Balanced automation",
    desc: "A balanced mode that follows fresh listings early, rides the hype, and looks to exit before the bearish fade deepens.",
    items: [
      "Balanced signal frequency",
      "Bot-assisted trade routing",
      "Major-asset rotation",
      "Daily monitoring",
    ],
    featured: true,
    fit: "A strong default if you want a smooth mix of speed, structure, and control.",
    reviewCadence: "Daily monitoring with steady weekly adjustments.",
  },
  {
    id: "aggressive-growth",
    icon: Rocket,
    title: "Momentum Capture",
    profile: "Track: Fast-moving opportunities",
    desc: "A faster style built to catch release momentum quickly and react before hype reversals hit harder.",
    items: [
      "Faster signal cadence",
      "Early opportunity bias",
      "Quicker execution timing",
      "Intraday review",
    ],
    fit: "Best if you are comfortable with stronger swings in return for faster reactions.",
    reviewCadence: "Intraday monitoring and faster changes.",
  },
];

export const fundingItems: FundingItem[] = [
  { icon: Bitcoin, title: "Bitcoin (BTC)", desc: "Use your BTC funding card after approval and copy the address shown for you." },
  { icon: Wallet, title: "Ethereum (ETH)", desc: "Use the ETH card and follow the network shown on the screen before you send." },
  { icon: Wallet, title: "USDT", desc: "Use the network shown on the USDT card so your funding reaches the right address." },
  { icon: ShieldCheck, title: "Linked To Your Account", desc: "Your funding instructions stay tied to your approved account so everything stays in one place." },
];

export const securityItems: SecurityItem[] = [
  { icon: ShieldCheck, title: "Protected Access", desc: "Funding stays locked until your setup is complete and your account is approved." },
  { icon: HardDrive, title: "Safer Funding Flow", desc: "You only see the address and instructions you need, without extra clutter." },
  { icon: ShieldAlert, title: "Account Checks Stay Linked", desc: "Your identity checks, funding progress, and cash-out checks stay tied to the same account." },
  { icon: Eye, title: "Clear Updates", desc: "You can follow your funding and account updates clearly without guessing what happens next." },
];

export const faqs: FAQItem[] = [
  {
    q: "What does the platform do?",
    a: "It gives you one guided place to set up your account, fund it, and run the AI bot inside a live trade room.",
  },
  {
    q: "When do I receive the $5 starter balance?",
    a: "The $5 starter balance appears after your account setup is approved, so you can start with the AI bot before making your first deposit.",
  },
  {
    q: "When does the funding page unlock?",
    a: "Funding opens as soon as your account setup is approved, each token card shows the exact address you should use, and every approved deposit receives an extra 10% bonus.",
  },
  {
    q: "Do approved deposits get a bonus?",
    a: "Yes. Every approved deposit adds an extra 10% to your main wallet after review.",
  },
  {
    q: "Can I withdraw the starter balance before I deposit?",
    a: "No. The starter balance is there to help you get started with the AI bot first. Sessions can return to your main wallet, but cash-out stays locked until your first confirmed deposit.",
  },
];
