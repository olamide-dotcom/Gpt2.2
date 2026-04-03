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
  { label: "Why Choose Us", href: "#why-choose-us" },
  { label: "Strategy Overview", href: "#strategies" },
];

export const heroStats: HeroStat[] = [
  { value: "24/7", label: "SIGNAL MONITORING" },
  { value: "4-step", label: "ONBOARDING FLOW" },
  { value: "Multi-token", label: "DEPOSIT READY" },
  { value: "Fast", label: "EXECUTION ROUTING" },
];

export const steps: StepItem[] = [
  {
    icon: UserPlus,
    num: 1,
    title: "Review Access Requirements",
    desc: "Start with the crypto essentials: jurisdiction checks, supported wallet networks, and the funding rules that govern the trading flow.",
  },
  {
    icon: Wallet,
    num: 2,
    title: "Complete Identity Checks",
    desc: "Verify the account holder before funding begins so KYC records, wallet routing, and deposit approvals stay linked to the right user.",
  },
  {
    icon: PieChart,
    num: 3,
    title: "Choose Strategy Track",
    desc: "Pick the crypto trading pace that fits you, from steadier confirmation to faster-moving market opportunity capture.",
  },
  {
    icon: BarChart3,
    num: 4,
    title: "Activate Account Workflows",
    desc: "Turn on wallet alerts, reporting, and treasury routing. Once approved, the deposit workspace unlocks automatically.",
  },
];

export const whyChooseUsItems: WhyChooseUsItem[] = [
  {
    icon: Zap,
    title: "Automation With Speed",
    desc: "The workflow is built to move quickly from signal review to account setup, so users do not lose time to scattered steps.",
  },
  {
    icon: Eye,
    title: "Early Opportunity Focus",
    desc: "Insider-bot signal support helps surface setups early, without forcing users to monitor the market all day.",
  },
  {
    icon: ShieldCheck,
    title: "Guided Verification",
    desc: "Onboarding stays clear and structured, so approvals, identity checks, and strategy selection happen in the right order.",
  },
  {
    icon: Wallet,
    title: "Deposit Control",
    desc: "Funding stays locked until onboarding is complete, then each supported token receives its own assigned deposit details.",
  },
];

export const strategies: StrategyItem[] = [
  {
    id: "conservative-growth",
    icon: Shield,
    title: "Steady Accumulate",
    profile: "Track: Lower volatility",
    desc: "A calmer route that waits for stronger confirmation before acting on crypto and insider-bot opportunities.",
    items: [
      "Lower trade frequency",
      "Extra signal confirmation",
      "Capital protection bias",
      "Weekly strategy review",
    ],
    fit: "Best for users who want guided exposure and a steadier rhythm instead of reacting to every alert.",
    reviewCadence: "Weekly review and slower rebalance windows.",
  },
  {
    id: "balanced-portfolio",
    icon: BarChart3,
    title: "Hybrid Insider Flow",
    profile: "Track: Balanced automation",
    desc: "Blends automated execution with insider-bot signal routing so users can move faster without feeling overwhelmed.",
    items: [
      "Balanced signal frequency",
      "Bot-assisted trade routing",
      "Major-asset rotation",
      "Daily monitoring",
    ],
    featured: true,
    fit: "A strong default for users who want speed, structure, and manageable risk in one workflow.",
    reviewCadence: "Daily monitoring with weekly adjustments.",
  },
  {
    id: "aggressive-growth",
    icon: Rocket,
    title: "Momentum Capture",
    profile: "Track: Fast-moving opportunities",
    desc: "A higher-tempo track for users who want earlier entries, quicker execution windows, and can handle sharper swings.",
    items: [
      "Faster signal cadence",
      "Early opportunity bias",
      "Quicker execution timing",
      "Intraday review",
    ],
    fit: "Best for users who are comfortable with stronger volatility in exchange for faster signal response.",
    reviewCadence: "Intraday monitoring and frequent optimization.",
  },
];

export const fundingItems: FundingItem[] = [
  { icon: Bitcoin, title: "Bitcoin (BTC)", desc: "Funding can be assigned after onboarding approval with a dedicated BTC deposit address." },
  { icon: Wallet, title: "Ethereum (ETH)", desc: "ETH deposits use an approved network label and account-linked address after activation." },
  { icon: Wallet, title: "USDT", desc: "Stablecoin funding is shown with the exact supported network so users send to the correct chain." },
  { icon: ShieldCheck, title: "Workflow-Linked Routing", desc: "Deposit instructions stay tied to the approved account instead of showing before verification." },
];

export const securityItems: SecurityItem[] = [
  { icon: ShieldCheck, title: "Step-Gated Access", desc: "Users cannot reach deposits until onboarding steps and approval are complete." },
  { icon: HardDrive, title: "No Frontend Keys", desc: "The deposit UI never exposes private keys and is ready to swap to server-issued addresses later." },
  { icon: ShieldAlert, title: "Linked Reviews", desc: "Identity checks, strategy choices, and funding state stay attached to the same account snapshot." },
  { icon: Eye, title: "Monitoring Ready", desc: "Incoming transaction tracking is already structured for webhook or polling-based reconciliation." },
];

export const faqs: FAQItem[] = [
  {
    q: "What does the platform do?",
    a: "It combines crypto-focused workflow setup, strategy-track selection, and insider-bot style signal support in one guided journey.",
  },
  {
    q: "When does the deposit page unlock?",
    a: "Deposit access unlocks after the onboarding workflow is completed and the final activation step approves the account.",
  },
  {
    q: "Can I continue later?",
    a: "Yes. Onboarding progress is stored locally in this implementation so the same user can return and continue from the saved step.",
  },
  {
    q: "Are wallet addresses live production wallets?",
    a: "Not yet. This implementation is backend-ready and keeps private keys out of the frontend, but production should replace the local adapter with server-issued addresses.",
  },
];
