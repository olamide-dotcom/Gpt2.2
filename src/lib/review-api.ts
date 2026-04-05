export type ReviewStatus = "pending" | "approved" | "declined";

export interface ReviewRecord {
  id: string;
  userId: string;
  reviewText: string;
  status: ReviewStatus;
  timestamp: string;
  updatedAt: string;
}

const apiBaseUrl = (import.meta.env.VITE_REVIEW_API_BASE_URL ?? "").trim();

const buildUrl = (path: string) => `${apiBaseUrl}${path}`;

const parseJson = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    const message = typeof (payload as { error?: string }).error === "string" ? (payload as { error?: string }).error : "Request failed.";
    throw new Error(message);
  }

  return payload;
};

export const submitReview = async (input: { userId: string; reviewText: string }) => {
  const response = await fetch(buildUrl("/submit-review"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<{ ok: true; review: ReviewRecord }>(response);
};

export const getMyReviews = async (userId: string) => {
  const response = await fetch(buildUrl(`/my-reviews/${encodeURIComponent(userId)}`));
  return parseJson<{ ok: true; reviews: ReviewRecord[] }>(response);
};

export const getAllReviews = async () => {
  const response = await fetch(buildUrl("/all-reviews"));
  return parseJson<{ ok: true; reviews: ReviewRecord[] }>(response);
};

export const updateReviewStatus = async (id: string, status: Exclude<ReviewStatus, "pending">) => {
  const response = await fetch(buildUrl(`/update-review/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  return parseJson<{ ok: true; review: ReviewRecord }>(response);
};

export const formatReviewDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
