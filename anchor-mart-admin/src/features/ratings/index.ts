// Public API for the ratings feature (Flow 16 admin surfaces) — import only from here.
export { RatingsPage } from "./components/RatingsPage";
export { RatingStars } from "./components/RatingStars";
export {
  useGetDeliveryRatingsQuery,
  useGetAppRatingsQuery,
  useGetRatingsSummaryQuery,
} from "./api/ratingApi";
export type { AppRating, DeliveryRating, RatingsSummary } from "./types/rating.types";
