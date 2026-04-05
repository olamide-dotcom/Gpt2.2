import cors from "cors";
import express from "express";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "reviews.json");
const publicDir = path.join(projectRoot, "public");
const distDir = path.join(projectRoot, "dist");
const port = Number(process.env.PORT || 3001);

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

const allowedStatuses = new Set(["pending", "approved", "declined"]);
const storageTemplate = { reviews: [] };

const ensureStorage = async () => {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, JSON.stringify(storageTemplate, null, 2));
  }
};

const readReviews = async () => {
  await ensureStorage();
  const raw = await readFile(dataFile, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed?.reviews) ? parsed.reviews : [];
};

const writeReviews = async (reviews) => {
  await ensureStorage();
  await writeFile(dataFile, JSON.stringify({ reviews }, null, 2));
};

const makeReviewId = () => {
  if (typeof crypto?.randomUUID === "function") {
    return `review-${crypto.randomUUID()}`;
  }

  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeReview = (review) => ({
  id: review.id,
  userId: String(review.userId),
  reviewText: String(review.reviewText),
  status: allowedStatuses.has(review.status) ? review.status : "pending",
  timestamp: review.timestamp,
  updatedAt: review.updatedAt ?? review.timestamp,
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "reviews", port });
});

app.get("/review-demo", (_req, res) => {
  res.sendFile(path.join(publicDir, "reviews-demo.html"));
});

app.post(["/submit-review", "/api/submit-review"], async (req, res) => {
  try {
    const userId = String(req.body?.userId ?? "").trim();
    const reviewText = String(req.body?.reviewText ?? "").trim();

    if (!userId || !reviewText) {
      return res.status(400).json({ error: "userId and reviewText are required." });
    }

    const timestamp = new Date().toISOString();
    const review = normalizeReview({
      id: makeReviewId(),
      userId,
      reviewText,
      status: "pending",
      timestamp,
      updatedAt: timestamp,
    });

    const reviews = await readReviews();
    reviews.unshift(review);
    await writeReviews(reviews);

    return res.status(201).json({ ok: true, review });
  } catch (error) {
    console.error("submit-review failed", error);
    return res.status(500).json({ error: "Failed to submit review." });
  }
});

app.get(["/my-reviews/:userId", "/api/my-reviews/:userId"], async (req, res) => {
  try {
    const userId = String(req.params.userId ?? "").trim();
    const reviews = await readReviews();
    const userReviews = reviews.filter((review) => review.userId === userId);
    return res.json({ ok: true, reviews: userReviews });
  } catch (error) {
    console.error("my-reviews failed", error);
    return res.status(500).json({ error: "Failed to fetch user reviews." });
  }
});

app.get(["/all-reviews", "/api/all-reviews"], async (_req, res) => {
  try {
    const reviews = await readReviews();
    return res.json({ ok: true, reviews });
  } catch (error) {
    console.error("all-reviews failed", error);
    return res.status(500).json({ error: "Failed to fetch reviews." });
  }
});

app.patch(["/update-review/:id", "/api/update-review/:id"], async (req, res) => {
  try {
    const nextStatus = String(req.body?.status ?? "").trim().toLowerCase();

    if (!allowedStatuses.has(nextStatus) || nextStatus === "pending") {
      return res.status(400).json({ error: "status must be approved or declined." });
    }

    const reviews = await readReviews();
    const reviewIndex = reviews.findIndex((review) => review.id === req.params.id);

    if (reviewIndex === -1) {
      return res.status(404).json({ error: "Review not found." });
    }

    const updatedReview = normalizeReview({
      ...reviews[reviewIndex],
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });

    reviews[reviewIndex] = updatedReview;
    await writeReviews(reviews);

    return res.json({ ok: true, review: updatedReview });
  } catch (error) {
    console.error("update-review failed", error);
    return res.status(500).json({ error: "Failed to update review." });
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/submit-review") || req.path.startsWith("/my-reviews") || req.path.startsWith("/update-review") || req.path.startsWith("/all-reviews") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "Not found." });
  }

  return next();
});

app.use(express.static(distDir));

app.get(/.*/, (req, res) => {
  const indexFile = path.join(distDir, "index.html");
  res.sendFile(indexFile, (error) => {
    if (error) {
      res.status(404).send("Build the frontend with `npm run build` or open /review-demo for the standalone HTML demo.");
    }
  });
});

await ensureStorage();

app.listen(port, () => {
  console.log(`Review server listening on http://localhost:${port}`);
});
