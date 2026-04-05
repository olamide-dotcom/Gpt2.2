import { useEffect, useState } from "react";
import { MessageSquare, RefreshCcw, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { formatReviewDate, getMyReviews, submitReview, type ReviewRecord } from "@/lib/review-api";

interface ReviewCenterProps {
  userId: string;
}

const badgeVariantByStatus: Record<ReviewRecord["status"], "outline" | "secondary" | "destructive"> = {
  pending: "outline",
  approved: "secondary",
  declined: "destructive",
};

const ReviewCenter = ({ userId }: ReviewCenterProps) => {
  const [reviewText, setReviewText] = useState("");
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadReviews = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsRefreshing(true);
    }

    try {
      const response = await getMyReviews(userId);
      setReviews(response.reviews);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load your reviews.";
      if (!options?.silent) {
        toast.error(message);
      }
    } finally {
      if (!options?.silent) {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    void loadReviews();

    const intervalId = window.setInterval(() => {
      void loadReviews({ silent: true });
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [userId]);

  const handleSubmit = async () => {
    const trimmedReview = reviewText.trim();

    if (!trimmedReview) {
      toast.error("Write a review before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      await submitReview({ userId, reviewText: trimmedReview });
      setReviewText("");
      toast.success("Review submitted. Status is pending until admin review.");
      await loadReviews({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit your review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border/80">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-gold" size={20} />
            <div>
              <CardTitle className="text-xl">Review Center</CardTitle>
              <CardDescription>Submit feedback from this account and track only your own review statuses.</CardDescription>
            </div>
          </div>
          <Badge variant="outline">User ID: {userId}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <div className="mb-3 text-sm font-medium text-foreground">Submit a review</div>
          <div className="space-y-3">
            <Textarea
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              placeholder="Share your experience, feature request, or issue."
              className="min-h-[120px]"
            />
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
                <Send size={16} />
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => void loadReviews()} disabled={isRefreshing}>
                <RefreshCcw size={16} />
                {isRefreshing ? "Refreshing..." : "Refresh Reviews"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">My reviews</div>
          {reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
              No reviews submitted yet.
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-border bg-background/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">{review.id}</div>
                    <div className="text-xs text-muted-foreground">Submitted {formatReviewDate(review.timestamp)}</div>
                  </div>
                  <Badge variant={badgeVariantByStatus[review.status]}>{review.status}</Badge>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{review.reviewText}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewCenter;
