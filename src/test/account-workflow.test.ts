import { beforeEach, describe, expect, it } from "vitest";

import {
  activateAccountWorkflows,
  applyManualDepositReview,
  clearWorkflowStorage,
  getWorkflowSnapshot,
  recordIncomingDeposit,
  refreshDepositTracking,
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
    expect(snapshot.depositAddresses).toHaveLength(3);

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

    expect(snapshot.mainWalletBalanceUsd).toBe(1000);
    expect(snapshot.dashboardUnlocked).toBe(true);
    expect(snapshot.simulatedDeposits).toHaveLength(1);

    snapshot = await startTradingBot({
      leverage: "5x",
      stopLossPercent: 8,
      takeProfitPercent: 12,
      riskLevel: "medium",
      strategyLabel: "Hybrid Insider Flow",
      allocationAmountUsd: 300,
    });

    expect(snapshot.mainWalletBalanceUsd).toBe(700);
    expect(snapshot.botWalletBalanceUsd).toBe(300);
    expect(snapshot.bot.active).toBe(true);
    expect(snapshot.bot.status).toBe("running");

    snapshot = await stopTradingBot();
    expect(snapshot.bot.active).toBe(false);
    expect(snapshot.bot.status).toBe("stopped");

    snapshot = await withdrawBotBalanceToMainWallet();
    expect(snapshot.mainWalletBalanceUsd).toBeGreaterThanOrEqual(1000);
    expect(snapshot.botWalletBalanceUsd).toBe(0);
    expect(snapshot.bot.status).toBe("idle");
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
    expect(snapshot.mainWalletBalanceUsd).toBe(0);

    snapshot = await applyManualDepositReview({
      requestId: snapshot.depositRequests[0]!.id,
      status: "approved",
      creditedAmountUsd: 1250,
      approvalMessage: "Confirmed from the local JSON review console.",
    });

    expect(snapshot.depositRequests[0]?.status).toBe("approved");
    expect(snapshot.depositRequests[0]?.creditedAmountUsd).toBe(1250);
    expect(snapshot.mainWalletBalanceUsd).toBe(1250);
    expect(snapshot.dashboardUnlocked).toBe(true);
    expect(snapshot.simulatedDeposits).toHaveLength(1);
    expect(snapshot.transactions[0]?.source).toBe("manual review");
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
