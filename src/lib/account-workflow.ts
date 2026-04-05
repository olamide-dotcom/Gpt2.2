import { strategies, type StrategyId } from "@/content/site";

const STORAGE_KEY = "gpt2.tradebot.onboarding-deposit.v2";
const BOT_TICK_INTERVAL_MS = 8_000;
const MAX_SYNC_TICKS = 240;
export const MAX_BOT_GAIN_PERCENT = 35;
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

export type DepositTokenCode = "ETH" | "USDT" | "BTC";
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

export interface WalletBalanceOverrideInput {
  mainWalletBalanceUsd?: number | null;
  botWalletBalanceUsd?: number | null;
}

export interface SubmitDepositRequestInput {
  tokenCode: DepositTokenCode;
  amountUsd: number;
  copiedAt?: string | null;
  submittedByTelegramId?: string | null;
}

export interface ManualDepositReviewInput {
  requestId: string;
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
  status: DepositRequestStatus;
  copiedAt: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  approvalMessage: string | null;
  submittedByTelegramId?: string | null;
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
    title: "Review Access Requirements",
    description: "Confirm supported jurisdictions, wallet-network rules, and crypto funding disclosures before deposit access is granted.",
  },
  {
    id: "complete-identity-checks",
    title: "Complete Identity Checks",
    description: "Capture KYC details, document origin, and contact records that should stay linked to future crypto deposits.",
  },
  {
    id: "choose-strategy-track",
    title: "Choose Strategy Track",
    description: "Pick the crypto trading pace and monitoring style that matches the account's risk tolerance.",
  },
  {
    id: "activate-account-workflows",
    title: "Activate Account Workflows",
    description: "Finalize alert routing, treasury handling, and wallet approval so deposit addresses can be assigned.",
  },
];

const depositWalletTemplates: Array<Omit<DepositWallet, "address" | "assignedAt">> = [
  {
    tokenCode: "ETH",
    tokenName: "Ethereum",
    networkLabel: "ERC20",
    instructions: [
      "Send only on the Ethereum mainnet shown in the assigned network label.",
      "Transfer from a wallet you control so support can verify origin if a review is needed.",
    ],
  },
  {
    tokenCode: "USDT",
    tokenName: "Tether USD",
    networkLabel: "TRC20",
    instructions: [
      "Use the TRC20 network label shown here. Sending another network can delay manual review.",
      "Include a transaction reference in your funding notes when treasury reconciliation is required.",
    ],
  },
  {
    tokenCode: "BTC",
    tokenName: "Bitcoin",
    networkLabel: "Bitcoin",
    instructions: [
      "Send only native BTC to this address. Wrapped or bridged assets should not be used here.",
      "Wait for the required network confirmations before expecting the balance to appear in your account workflow.",
    ],
  },
];

const leverageMultipliers: Record<BotLeverage, number> = {
  "1x": 0.35,
  "5x": 0.7,
  "10x": 0.95,
  "20x": 1.2,
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

const strategyDrift: Record<StrategyId, number> = {
  "conservative-growth": 0.004,
  "balanced-portfolio": 0.008,
  "aggressive-growth": 0.012,
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
});

const nowIso = () => new Date().toISOString();

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

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
  };

  const mainWalletBalanceUsd = sanitizeNumber(snapshot.mainWalletBalanceUsd);
  const botWalletBalanceUsd = normalizedBot.currentBalanceUsd || sanitizeNumber(snapshot.botWalletBalanceUsd);

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
    })),
    mainWalletBalanceUsd,
    botWalletBalanceUsd,
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
  const seed = `${userId}:${tokenCode}`;

  switch (tokenCode) {
    case "ETH":
      return buildEthAddress(seed);
    case "USDT":
      return buildUsdtAddress(seed);
    case "BTC":
      return buildBtcAddress(seed);
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

const getStrategyLabel = (strategyId: StrategyId | null) =>
  strategies.find((strategy) => strategy.id === strategyId)?.title ?? "AI Insider Flow";

const getActiveTradeLabel = (snapshot: WorkflowSnapshot, riskLevel: BotRiskLevel) => {
  const strategyLabel = getStrategyLabel(snapshot.selectedStrategyId);

  switch (riskLevel) {
    case "low":
      return `${strategyLabel} / BTC stability ladder`;
    case "medium":
      return `${strategyLabel} / ETH momentum rotation`;
    case "high":
      return `${strategyLabel} / Insider signal breakout`;
  }
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

const ensureDashboardState = (snapshot: WorkflowSnapshot): WorkflowSnapshot => ({
  ...snapshot,
  botWalletBalanceUsd: roundCurrency(snapshot.bot.currentBalanceUsd),
  dashboardUnlocked:
    snapshot.dashboardUnlocked ||
    snapshot.mainWalletBalanceUsd > 0 ||
    snapshot.bot.currentBalanceUsd > 0 ||
    snapshot.simulatedDeposits.length > 0,
});

const syncTradingBotState = (snapshot: WorkflowSnapshot, now = new Date()): WorkflowSnapshot => {
  if (!snapshot.bot.active || !snapshot.bot.tradingSettings || !snapshot.bot.lastUpdatedAt || !snapshot.bot.sessionId) {
    return snapshot;
  }

  const lastUpdatedAt = new Date(snapshot.bot.lastUpdatedAt);
  const elapsedMs = now.getTime() - lastUpdatedAt.getTime();
  const elapsedTicks = Math.floor(elapsedMs / BOT_TICK_INTERVAL_MS);

  if (elapsedTicks <= 0) {
    return snapshot;
  }

  const appliedTicks = Math.min(elapsedTicks, MAX_SYNC_TICKS);
  const startingBalanceUsd = snapshot.bot.startingBalanceUsd || snapshot.bot.currentBalanceUsd;
  const strategyBonus = strategyDrift[snapshot.selectedStrategyId ?? "balanced-portfolio"];
  const { leverage, riskLevel, stopLossPercent, takeProfitPercent } = snapshot.bot.tradingSettings;
  const cappedStopLossPercent = Math.min(stopLossPercent, MAX_BOT_LOSS_PERCENT);
  const cappedTakeProfitPercent = Math.min(takeProfitPercent, MAX_BOT_GAIN_PERCENT);

  let currentBalanceUsd = snapshot.bot.currentBalanceUsd;
  let tickCount = snapshot.bot.tickCount;
  let active = snapshot.bot.active;
  let status: BotStatus = "running";
  let stoppedAt = snapshot.bot.stoppedAt;

  // Keep the simulation deterministic so refreshes and tests converge on the same wallet state.
  for (let index = 0; index < appliedTicks; index += 1) {
    const noise = seedToSignedUnit(`${snapshot.bot.sessionId}:${tickCount + index}`);
    const changePercent = (riskBaseReturn[riskLevel] + strategyBonus + noise * riskVolatility[riskLevel]) * leverageMultipliers[leverage];
    currentBalanceUsd = roundCurrency(Math.max(0, currentBalanceUsd * (1 + changePercent / 100)));

    const profitLossPercent = startingBalanceUsd > 0 ? ((currentBalanceUsd - startingBalanceUsd) / startingBalanceUsd) * 100 : 0;

    if (profitLossPercent >= cappedTakeProfitPercent) {
      currentBalanceUsd = roundCurrency(startingBalanceUsd * (1 + cappedTakeProfitPercent / 100));
      active = false;
      status = "take_profit_hit";
      stoppedAt = now.toISOString();
      break;
    }

    if (profitLossPercent <= -cappedStopLossPercent) {
      currentBalanceUsd = roundCurrency(startingBalanceUsd * (1 - cappedStopLossPercent / 100));
      active = false;
      status = "stop_loss_hit";
      stoppedAt = now.toISOString();
      break;
    }
  }

  tickCount += appliedTicks;

  const profitUsd = roundCurrency(currentBalanceUsd - startingBalanceUsd);
  const profitLossPercent = startingBalanceUsd > 0 ? roundCurrency(((currentBalanceUsd - startingBalanceUsd) / startingBalanceUsd) * 100) : 0;

  return ensureDashboardState({
    ...snapshot,
    bot: {
      ...snapshot.bot,
      active,
      status,
      currentBalanceUsd,
      profitUsd,
      profitLossPercent,
      tickCount,
      lastUpdatedAt: new Date(lastUpdatedAt.getTime() + appliedTicks * BOT_TICK_INTERVAL_MS).toISOString(),
      stoppedAt,
    },
  });
};

const creditApprovedDeposit = (
  snapshot: WorkflowSnapshot,
  wallet: Pick<DepositWallet, "tokenCode" | "tokenName" | "networkLabel" | "address">,
  amountUsd: number,
  source: string,
  txHash: string,
  creditedAt: string,
  incrementMainWalletBalance = true,
) =>
  ensureDashboardState({
    ...snapshot,
    mainWalletBalanceUsd: incrementMainWalletBalance
      ? roundCurrency(snapshot.mainWalletBalanceUsd + amountUsd)
      : snapshot.mainWalletBalanceUsd,
    simulatedDeposits: [
      {
        id: createEntityId("simulated-deposit"),
        tokenCode: wallet.tokenCode,
        tokenName: wallet.tokenName,
        networkLabel: wallet.networkLabel,
        address: wallet.address,
        amountUsd,
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
        amount: amountUsd.toFixed(2),
        status: "confirmed",
        source,
        txHash,
        detectedAt: creditedAt,
      },
      ...snapshot.transactions,
    ],
  });

const persistSnapshot = (snapshot: WorkflowSnapshot) => {
  const normalizedSnapshot = normalizeSnapshot({
    ...snapshot,
    updatedAt: nowIso(),
  });

  writeStorage(normalizedSnapshot);
  return normalizedSnapshot;
};

const updateSnapshot = async (updater: (snapshot: WorkflowSnapshot) => WorkflowSnapshot) => {
  const currentSnapshot = readStoredSnapshot();
  const nextSnapshot = updater(currentSnapshot);
  return nextSnapshot === currentSnapshot ? currentSnapshot : persistSnapshot(nextSnapshot);
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
  let nextSnapshot = currentSnapshot;

  if (currentSnapshot.approvalStatus === "approved" && currentSnapshot.depositAddresses.length === 0) {
    nextSnapshot = {
      ...nextSnapshot,
      depositAddresses: createDepositAddresses(nextSnapshot),
    };
  }

  nextSnapshot = syncTradingBotState(nextSnapshot);

  return nextSnapshot !== currentSnapshot ? persistSnapshot(nextSnapshot) : currentSnapshot;
};

export const setCurrentWorkflowStep = async (stepId: OnboardingStepId) =>
  updateSnapshot((snapshot) => (canOpenWorkflowStep(snapshot, stepId) ? { ...snapshot, currentStepId: stepId } : snapshot));

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
      // grant demo bonus on activation; keep it locked until a deposit + active trading
      bonusUsd: roundCurrency((snapshot.bonusUsd ?? 0) + 5),
      bonusLocked: true,
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
          status: "pending_review",
          copiedAt: input.copiedAt ?? null,
          submittedByTelegramId: input.submittedByTelegramId ?? null,
          submittedAt: nowIso(),
          reviewedAt: null,
          approvalMessage: "Awaiting manual review.",
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

export const applyManualDepositReview = async (input: ManualDepositReviewInput) =>
  updateSnapshot((currentSnapshot) => {
    const snapshot = syncTradingBotState(currentSnapshot);
    const request = snapshot.depositRequests.find((item) => item.id === input.requestId);

    if (!request || request.status !== "pending_review") {
      return snapshot;
    }

    const reviewedAt = nowIso();
    const creditedAmountUsd = sanitizeNumber(input.creditedAmountUsd ?? request.requestedAmountUsd);
    const approvalMessage =
      input.approvalMessage?.trim() ||
      (input.status === "approved"
        ? "Deposit confirmed manually and credited to the wallet."
        : "Deposit request rejected during manual review.");

    let nextSnapshot: WorkflowSnapshot = {
      ...snapshot,
      depositRequests: snapshot.depositRequests.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: input.status,
              creditedAmountUsd: input.status === "approved" ? creditedAmountUsd : null,
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
  });

export interface ManualIdReviewInput {
  requestId: string;
  status: Exclude<IdVerificationStatus, "pending_review">;
  approvalMessage?: string;
}

export const applyManualIdReview = async (input: ManualIdReviewInput) =>
  updateSnapshot((currentSnapshot) => {
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

    return nextSnapshot;
  });

export const setWalletBalances = async (input: WalletBalanceOverrideInput) =>
  updateSnapshot((currentSnapshot) => applyWalletBalanceOverrides(syncTradingBotState(currentSnapshot), input));

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

    const depositPresent = (snapshot.simulatedDeposits?.length ?? 0) > 0 || sanitizeNumber(snapshot.mainWalletBalanceUsd) > 0;

    return ensureDashboardState({
      ...snapshot,
      mainWalletBalanceUsd: roundCurrency(snapshot.mainWalletBalanceUsd - allocationAmountUsd),
      botWalletBalanceUsd: nextBotBalance,
      // if there's a deposit present and bot is starting, unlock bonus for withdrawal
      bonusLocked: depositPresent ? false : snapshot.bonusLocked,
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
        activeTradeLabel: getActiveTradeLabel(snapshot, input.riskLevel),
        startedAt,
        stoppedAt: null,
        lastUpdatedAt: startedAt,
        sessionId: createEntityId("bot"),
        tickCount: 0,
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

    return ensureDashboardState({
      ...snapshot,
      bot: {
        ...snapshot.bot,
        active: false,
        status: "stopped",
        stoppedAt: nowIso(),
      },
    });
  });

export const withdrawBotBalanceToMainWallet = async () =>
  updateSnapshot((currentSnapshot) => {
    const snapshot = syncTradingBotState(currentSnapshot);

    if (snapshot.bot.active || snapshot.botWalletBalanceUsd <= 0) {
      return snapshot;
    }

    const withdrawnAmountUsd = snapshot.botWalletBalanceUsd;

    return ensureDashboardState({
      ...snapshot,
      mainWalletBalanceUsd: roundCurrency(snapshot.mainWalletBalanceUsd + withdrawnAmountUsd),
      botWalletBalanceUsd: 0,
      bot: {
        ...defaultBotState(),
        tradingSettings: snapshot.bot.tradingSettings,
        status: "idle",
      },
    });
  });
