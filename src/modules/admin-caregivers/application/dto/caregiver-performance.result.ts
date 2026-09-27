/** The four headline score cards on the Performance tab. */
export interface CaregiverPerformanceScoreCards {
  /** Composite quality score (0 to 5) blending completion, punctuality and satisfaction. */
  overallScore: number | null;
  punctualityPercent: number | null;
  clientSatisfaction: number | null;
  taskCompletionPercent: number | null;
}

/** This month's operational key metrics. */
export interface CaregiverKeyMetricsResult {
  visitsCompleted: number;
  hoursLogged: number;
  onTimeArrivals: { onTime: number; total: number; percent: number | null };
  missedVisits: number;
  lateArrivals: { count: number; averageMinutesLate: number | null };
  earlyDepartures: number;
  overtimeHours: number;
}

/** The client feedback column: rating spread, praised traits and coaching flags. */
export interface CaregiverClientFeedbackResult {
  averageRating: number | null;
  totalReviews: number;
  positiveReviews: number;
  neutralReviews: number;
  negativeReviews: number;
  mostPraisedTraits: string[];
  areasForGrowth: string[];
}

/** One point on the six month trend. */
export interface CaregiverPerformanceTrendPointResult {
  monthLabel: string;
  score: number | null;
}

/** One row of the Performance History table. */
export interface CaregiverPerformanceHistoryRowResult {
  monthLabel: string;
  score: number | null;
  visits: number;
  hours: number;
  punctualityPercent: number | null;
  csat: number | null;
}

/** One entry in Recent Reviews and Feedback. */
export interface CaregiverReviewResult {
  authorName: string | null;
  relationship: string | null;
  reviewerType: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  rating: number;
  comment: string | null;
  recipientName: string | null;
  createdAt: string;
}

/** The composed caregiver Performance tab. */
export interface CaregiverPerformanceTabResult {
  periodLabel: string;
  scoreCards: CaregiverPerformanceScoreCards;
  keyMetrics: CaregiverKeyMetricsResult;
  clientFeedback: CaregiverClientFeedbackResult;
  trend: CaregiverPerformanceTrendPointResult[];
  history: CaregiverPerformanceHistoryRowResult[];
  recentReviews: CaregiverReviewResult[];
}
