import { beforeEach, describe, expect, it } from "vitest";

import {
  activateAccountWorkflows,
  applyManualDepositReview,
  clearWorkflowStorage,
  getBotExecutionCadenceMs,
  getWithdrawableBalance,
  getWorkflowSnapshot,
  recordIncomingDeposit,
  refreshDepositTracking,
  replaceWorkflowSnapshot,
  saveIdentityChecks,
  saveReviewAccessRequirements,
  saveStrategyTrack,
  setWalletBalances,
  simulateDepositCredit,
  startTradingBot,
  submitDepositRequest,
  stopTradingBot,
  withdrawBotBalanceToMainWallet,
} from "@/lib/account-workflow";

describe("account workflow service", () => {
  beforeEach(() => {
    clearWorkflowStorage();
  });

  it("persists onboarding progress and unlocks deposit addresses after approval", async () => {
    let snapshot = await getWorkflowSnapshot();

    expect(snapshot.approvalStatus).toBe("draft");
    expect(snapshot.depositAddresses).toHaveLength(0);

    snapshot = await saveReviewAccessRequirements({
      residenceCountry: "Nigeria",
      investorProfile: "individual",
      acknowledgements: {
        disclosures: true,
        eligibility: true,
        communications: true,
      },
    });

    expect(snapshot.completedStepIds).toContain("review-access-requirements");
    expect(snapshot.currentStepId).toBe("complete-identity-checks");

    snapshot = await saveIdentityChecks({
      fullName: "Ada Okafor",
      email: "ada@example.com",
      country: "Nigeria",
      idType: "passport",
      notes: "Verified through local test adapter.",
    });

    expect(snapshot.completedStepIds).toContain("complete-identity-checks");

    snapshot = await saveStrategyTrack("balanced-portfolio");
    expect(snapshot.selectedStrategyId).toBe("balanced-portfolio");
    expect(snapshot.currentStepId).toBe("activate-account-workflows");

    snapshot = await activateAccountWorkflows({
      supportChannel: "email",
      reportingCadence: "weekly",
      alertsEnabled: true,
      fundingAcknowledgement: true,
    });

    expect(snapshot.approvalStatus).toBe("approved");
    expect(snapshot.mainWalletBalanceUsd).toBe(5);
    expect(snapshot.bonusUsd).toBe(5);
    expect(snapshot.bonusLocked).toBe(true);
    expect(snapshot.depositAddresses).toHaveLength(4);

    const reloadedSnapshot = await getWorkflowSnapshot();

    expect(reloadedSnapshot.userId).toBe(snapshot.userId);
    expect(reloadedSnapshot.depositAddresses[0]?.address).toBe(snapshot.depositAddresses[0]?.address);
  });

  it("tracks polling heartbeats and links incoming deposits to the stored account", async () => {
    await saveReviewAccessRequirements({
      residenceCountry: "Nigeria",
      investorProfile: "individual",
      acknowledgements: {
        disclosures: true,
        eligibility: true,
        communications: true,
      },
    });

    await saveIdentityChecks({
      fullName: "Ada Okafor",
      email: "ada@example.com",
      country: "Nigeria",
      idType: "passport",
      notes: "",
    });

    await saveStrategyTrack("conservative-growth");

    let snapshot = await activateAccountWorkflows({
      supportChannel: "ops-desk",
      reportingCadence: "monthly",
      alertsEnabled: true,
      fundingAcknowledgement: true,
    });

    snapshot = await refreshDepositTracking("polling");
    expect(snapshot.syncState.lastPollingCheckAt).not.toBeNull();

    snapshot = await recordIncomingDeposit({
      tokenCode: "USDT",
      amount: "2500.00",
      txHash: "tx-demo-usdt-001",
      source: "webhook",
    });

    expect(snapshot.transactions).toHaveLength(1);
    expect(snapshot.transactions[0]?.tokenCode).toBe("USDT");
    expect(snapshot.transactions[0]?.address).toBe(snapshot.depositAddresses.find((wallet) => wallet.tokenCode === "USDT")?.address);
  });

  it("credits deposits into the main wallet and moves funds through the bot lifecycle", async () => {
    await saveReviewAccessRequirements({
      residenceCountry: "Nigeria",
      investorProfile: "individual",
      acknowledgements: {
        disclosures: true,
        eligibility: true,
        communications: true,
      },
    });

    await saveIdentityChecks({
      fullName: "Ada Okafor",
      email: "ada@example.com",
      country: "Nigeria",
      idType: "passport",
      notes: "",
    });

    await saveStrategyTrack("balanced-portfolio");
    await activateAccountWorkflows({
      supportChannel: "email",
      reportingCadence: "weekly",
      alertsEnabled: true,
      fundingAcknowledgement: true,
    });

    let snapshot = await simulateDepositCredit({
      tokenCode: "BTC",
      amountUsd: 1000,
    });

    expect(snapshot.mainWalletBalanceUsd).toBe(1105);
    expect(snapshot.dashboardUnlocked).toBe(true);
    expect(snapshot.simulatedDeposits).toHaveLength(1);
    expect(snapshot.bonusLocked).toBe(false);

    snapshot = await startTradingBot({
      leverage: "5x",
      stopLossPercent: 8,
      takeProfitPercent: 12,
      riskLevel: "medium",
      strategyLabel: "Hybrid Insider Flow",
      allocationAmountUsd: 300,
    });

    expect(snapshot.mainWalletBalanceUsd).toBe(805);
    expect(snapshot.botWalletBalanceUsd).toBe(300);
    expect(snapshot.bot.active).toBe(true);
    expect(snapshot.bot.status).toBe("running");
    expect(snapshot.bot.equityHistory.length).toBeGreaterThan(0);
    expect(snapshot.bot.tradeHistory[0]?.status).toBe("running");
    expect(snapshot.bot.tradeHistory[0]?.allocatedAmountUsd).toBe(300);

    snapshot = await stopTradingBot();
    expect(snapshot.bot.active).toBe(false);
    expect(snapshot.bot.status).toBe("stopped");
    expect(snapshot.bot.tradeHistory[0]?.status).toBe("closed");
    expect(snapshot.bot.tradeHistory[0]?.closeReason).toBe("manual_stop");

    snapshot = await withdrawBotBalanceToMainWallet();
    expect(snapshot.mainWalletBalanceUsd).toBeGreaterThanOrEqual(1105);
    expect(snapshot.botWalletBalanceUsd).toBe(0);
    expect(snapshot.bot.status).toBe("idle");
    expect(snapshot.bot.tradeHistory.length).toBeGreaterThan(0);
  });

  it("keeps the starter balance non-withdrawable until a deposit is confirmed", async () => {
    await saveReviewAccessRequirements({
      residenceCountry: "Nigeria",
      investorProfile: "individual",
      acknowledgements: {
        disclosures: true,
        eligibility: true,
        communications: true,
      },
    });

    await saveIdentityChecks({
      fullName: "Ada Okafor",
      email: "ada@example.com",
      country: "Nigeria",
      idType: "passport",
      notes: "",
    });

    await saveStrategyTrack("balanced-portfolio");
    await activateAccountWorkflows({
      supportChannel: "email",
      reportingCadence: "weekly",
      alertsEnabled: true,
      fundingAcknowledgement: true,
    });

    let snapshot = await startTradingBot({
      leverage: "1x",
      stopLossPercent: 5,
      takeProfitPercent: 8,
      riskLevel: "low",
      strategyLabel: "Starter test",
      allocationAmountUsd: 5,
    });

    expect(snapshot.mainWalletBalanceUsd).toBe(0);
    expect(snapshot.botWalletBalanceUsd).toBe(5);

    snapshot = await stopTradingBot();
    const stoppedBotBalance = snapshot.botWalletBalanceUsd;

    snapshot = await withdrawBotBalanceToMainWallet();
    expect(snapshot.mainWalletBalanceUsd).toBe(stoppedBotBalance);
    expect(snapshot.botWalletBalanceUsd).toBe(0);
    expect(getWithdrawableBalance(snapshot)).toBe(0);
    expect(snapshot.bonusLocked).toBe(true);
  });

  it("queues manual deposit requests and credits the wallet after approval", async () => {
    await saveReviewAccessRequirements({
      residenceCountry: "Nigeria",
      investorProfile: "individual",
      acknowledgements: {
        disclosures: true,
        eligibility: true,
        communications: true,
      },
    });

    await saveIdentityChecks({
      fullName: "Ada Okafor",
      email: "ada@example.com",
      country: "Nigeria",
      idType: "passport",
      notes: "",
    });

    await saveStrategyTrack("balanced-portfolio");
    await activateAccountWorkflows({
      supportChannel: "email",
      reportingCadence: "weekly",
      alertsEnabled: true,
      fundingAcknowledgement: true,
    });

    let snapshot = await submitDepositRequest({
      tokenCode: "ETH",
      amountUsd: 1250,
      copiedAt: "2026-04-03T00:00:00.000Z",
    });

    expect(snapshot.depositRequests).toHaveLength(1);
    expect(snapshot.depositRequests[0]?.status).toBe("pending_review");
    expect(snapshot.mainWalletBalanceUsd).toBe(5);

    snapshot = await applyManualDepositReview({
      requestId: snapshot.depositRequests[0]!.id,
      status: "approved",
      creditedAmountUsd: 1250,
      approvalMessage: "Confirmed from the control panel.",
    });

    expect(snapshot.depositRequests[0]?.status).toBe("approved");
    expect(snapshot.depositRequests[0]?.creditedAmountUsd).toBe(1250);
    expect(snapshot.depositRequests[0]?.depositBonusUsd).toBe(125);
    expect(snapshot.depositRequests[0]?.totalCreditedAmountUsd).toBe(1375);
    expect(snapshot.mainWalletBalanceUsd).toBe(1380);
    expect(snapshot.dashboardUnlocked).toBe(true);
    expect(snapshot.simulatedDeposits).toHaveLength(1);
    expect(snapshot.transactions[0]?.source).toBe("manual review");
    expect(snapshot.bonusLocked).toBe(false);
  });

  it("lets local wallet balance edits override persisted balances", async () => {
    let snapshot = await setWalletBalances({
      mainWalletBalanceUsd: 2750.5,
      botWalletBalanceUsd: 125.25,
    });

    expect(snapshot.mainWalletBalanceUsd).toBe(2750.5);
    expect(snapshot.botWalletBalanceUsd).toBe(125.25);

    snapshot = await getWorkflowSnapshot();

    expect(snapshot.mainWalletBalanceUsd).toBe(2750.5);
    expect(snapshot.botWalletBalanceUsd).toBe(125.25);
  });

  it("makes high leverage and risk run on a faster bot cadence", () => {
    const lowCadence = getBotExecutionCadenceMs({
      leverage: "1x",
      riskLevel: "low",
    });
    const highCadence = getBotExecutionCadenceMs({
      leverage: "20x",
      riskLevel: "high",
    });

    expect(highCadence).toBeLessThan(lowCadence);
    expect(highCadence).toBeGreaterThanOrEqual(2400);
  });

  it("auto-returns the session balance to the main wallet when take profit or stop loss is hit", async () => {
    await saveReviewAccessRequirements({
      residenceCountry: "Nigeria",
      investorProfile: "individual",
      acknowledgements: {
        disclosures: true,
        eligibility: true,
        communications: true,
      },
    });

    await saveIdentityChecks({
      fullName: "Ada Okafor",
      email: "ada@example.com",
      country: "Nigeria",
      idType: "passport",
      notes: "",
    });

    await saveStrategyTrack("aggressive-growth");
    await activateAccountWorkflows({
      supportChannel: "email",
      reportingCadence: "weekly",
      alertsEnabled: true,
      fundingAcknowledgement: true,
    });
    await simulateDepositCredit({
      tokenCode: "SOL",
      amountUsd: 600,
    });

    let snapshot = await startTradingBot({
      leverage: "20x",
      stopLossPercent: 1.5,
      takeProfitPercent: 1.5,
      riskLevel: "high",
      strategyLabel: "Launch Radar",
      allocationAmountUsd: 250,
    });

    const preSettlementMainWallet = snapshot.mainWalletBalanceUsd;

    snapshot = replaceWorkflowSnapshot({
      ...snapshot,
      bot: {
        ...snapshot.bot,
        lastUpdatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
    });

    snapshot = await getWorkflowSnapshot();

    expect(snapshot.bot.active).toBe(false);
    expect(["take_profit_hit", "stop_loss_hit"]).toContain(snapshot.bot.status);
    expect(snapshot.botWalletBalanceUsd).toBe(0);
    expect(snapshot.mainWalletBalanceUsd).not.toBe(preSettlementMainWallet);
    expect(snapshot.bot.tradeHistory[0]?.status).toBe("closed");
    expect(snapshot.bot.tradeHistory[0]?.settledAmountUsd).not.toBeNull();
    expect(snapshot.bot.tradeHistory[0]?.settledToMainWalletAt).not.toBeNull();
  });

  it("caps trading bot profit and loss thresholds at the configured guardrails", async () => {
    await saveReviewAccessRequirements({
      residenceCountry: "Nigeria",
      investorProfile: "individual",
      acknowledgements: {
        disclosures: true,
        eligibility: true,
        communications: true,
      },
    });

    await saveIdentityChecks({
      fullName: "Ada Okafor",
      email: "ada@example.com",
      country: "Nigeria",
      idType: "passport",
      notes: "",
    });

    await saveStrategyTrack("balanced-portfolio");
    await activateAccountWorkflows({
      supportChannel: "email",
      reportingCadence: "weekly",
      alertsEnabled: true,
      fundingAcknowledgement: true,
    });
    await simulateDepositCredit({
      tokenCode: "USDT",
      amountUsd: 1500,
    });

    const snapshot = await startTradingBot({
      leverage: "20x",
      stopLossPercent: 45,
      takeProfitPercent: 80,
      riskLevel: "high",
      strategyLabel: "Momentum Capture",
      allocationAmountUsd: 500,
    });

    expect(snapshot.bot.tradingSettings?.stopLossPercent).toBe(15);
    expect(snapshot.bot.tradingSettings?.takeProfitPercent).toBe(30);
  });
});
