import { useEffect, useState } from "react";
import { Check, MessageSquareMore, RefreshCcw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { formatReviewDate, getAllReviews, updateReviewStatus, type ReviewRecord } from "@/lib/review-api";

const statusBadgeVariant: Record<ReviewRecord["status"], "outline" | "secondary" | "destructive"> = {
  pending: "outline",
  approved: "secondary",
  declined: "destructive",
};

const ReviewModerationConsole = () => {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const loadReviews = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }

    try {
      const response = await getAllReviews();
      setReviews(response.reviews);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load reviews.";
      if (!options?.silent) {
        toast.error(message);
      }
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadReviews();

    const intervalId = window.setInterval(() => {
      void loadReviews({ silent: true });
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleModeration = async (reviewId: string, status: "approved" | "declined") => {
    setActiveId(reviewId);

    try {
      await updateReviewStatus(reviewId, status);
      toast.success(`Review ${status}.`);
      await loadReviews({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update review.");
    } finally {
      setActiveId(null);
    }
  };

  const pendingCount = reviews.filter((review) => review.status === "pending").length;

  return (
    <Card className="border-border/80">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MessageSquareMore className="text-gold" size={20} />
            <div>
              <CardTitle className="text-lg">Review moderation</CardTitle>
              <CardDescription>See all user reviews and approve or decline them from the shared backend.</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{pendingCount} pending</Badge>
            <Button type="button" size="sm" variant="ghost" onClick={() => void loadReviews()} disabled={isLoading}>
              <RefreshCcw size={16} />
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
            No reviews have been submitted yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Review</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="max-w-[420px]">
                    <div className="space-y-2">
                      <div className="font-medium text-foreground">{review.id}</div>
                      <div className="whitespace-pre-wrap text-sm text-muted-foreground">{review.reviewText}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{review.userId}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant[review.status]}>{review.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatReviewDate(review.timestamp)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleModeration(review.id, "approved")}
                        disabled={activeId === review.id || review.status === "approved"}
                      >
                        <Check size={16} />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleModeration(review.id, "declined")}
                        disabled={activeId === review.id || review.status === "declined"}
                      >
                        <X size={16} />
                        Decline
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewModerationConsole;
