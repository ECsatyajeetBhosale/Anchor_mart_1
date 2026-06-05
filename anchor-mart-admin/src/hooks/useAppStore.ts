import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store";

/**
 * Typed dispatch hook — use this instead of useDispatch() directly.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/**
 * Typed selector hook — use this instead of useSelector() directly.
 */
export const useAppSelector = useSelector.withTypes<RootState>();
