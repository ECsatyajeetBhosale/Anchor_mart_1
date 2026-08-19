import { MESSAGES } from "@/lib/messages";
import { statText, statsError, statsState } from "@/lib/stats";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatsGrid } from "./StatsGrid";

const icon = <span data-testid="icon" />;

/** Builds a deck the way a screen does: its own config, the shared reader. */
function deck(state: ReturnType<typeof statsState>, counts: Record<string, number | undefined>) {
  return Object.entries(counts).map(([id, value]) => ({
    id,
    label: id,
    value: statText(state, value),
    icon,
  }));
}

const READY = statsState({ isLoading: false, isError: false });
const LOADING = statsState({ isLoading: true, isError: false });
const FAILED = statsState({ isLoading: false, isError: true });

describe("StatsGrid", () => {
  it("renders a zero bucket as a card reading 0", () => {
    // §6 — a zero is a fact, not a reason to hide or dash out the card.
    render(<StatsGrid items={deck(READY, { sourcing: 0, verification: 8 })} />);
    expect(screen.getByText("sourcing")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("dashes out while loading and says nothing about failure", () => {
    render(<StatsGrid items={deck(LOADING, { sourcing: 0 })} error={statsError(LOADING)} />);
    expect(screen.getByText(MESSAGES.COMMON.STATS.DASH)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the failure instead of a deck of zeros", () => {
    // §7 — an error and a genuine zero must not look the same.
    render(
      <StatsGrid
        items={deck(FAILED, { sourcing: 0, verification: 8 })}
        error={statsError(FAILED)}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(MESSAGES.COMMON.STATS.ERROR);
    expect(screen.queryByText("8")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("offers a retry only when the screen supplies one", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<StatsGrid items={[]} error={statsError(FAILED)} />);
    expect(screen.queryByRole("button", { name: MESSAGES.COMMON.RETRY })).not.toBeInTheDocument();

    rerender(<StatsGrid items={[]} error={statsError(FAILED)} onRetry={onRetry} />);
    screen.getByRole("button", { name: MESSAGES.COMMON.RETRY }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("stays silent on a healthy deck", () => {
    render(<StatsGrid items={deck(READY, { delivered: 77 })} error={statsError(READY)} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("knows nothing about which screen a bucket belongs to", () => {
    // §4 — the same token from two different APIs renders identically here;
    // the meaning stays with the screen that owns the mapping.
    render(
      <>
        <StatsGrid items={[{ id: "intent-new", label: "New Intents", value: "7", icon }]} />
        <StatsGrid items={[{ id: "order-new", label: "New Orders", value: "7", icon }]} />
      </>,
    );
    expect(screen.getByText("New Intents")).toBeInTheDocument();
    expect(screen.getByText("New Orders")).toBeInTheDocument();
  });
});
