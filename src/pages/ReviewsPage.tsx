import JourneyShell from "@/components/JourneyShell";
import ReviewCenter from "@/components/reviews/ReviewCenter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";

const ReviewsPage = () => {
  const { isLoading, snapshot } = useAccountWorkflow();

  return (
    <JourneyShell
      stage="landing"
      title="Submit And Track Reviews"
      description="This review page is open to any session, so you can test from different browsers or devices without unlocking the trading dashboard first."
    >
      {isLoading || !snapshot ? (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-xl">Loading review workspace</CardTitle>
            <CardDescription>Preparing a session-specific user ID and review history.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Each browser session gets its own review identity unless you later connect it to a shared account system.
          </CardContent>
        </Card>
      ) : (
        <ReviewCenter userId={snapshot.userId} />
      )}
    </JourneyShell>
  );
};

export default ReviewsPage;
