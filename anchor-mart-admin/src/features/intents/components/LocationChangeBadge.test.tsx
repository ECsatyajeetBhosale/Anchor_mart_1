import { MESSAGES } from "@/lib/messages";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { IntentLocationChange } from "../types/intent.types";
import { LocationChangeBadge } from "./LocationChangeBadge";

const M = MESSAGES.INTENTS.LOCATION_CHANGE;

function change(partial: Partial<IntentLocationChange>): IntentLocationChange {
  return { state: "report_pending", delta_id: null, report_id: null, amount: null, ...partial };
}

describe("LocationChangeBadge", () => {
  it("renders nothing when the sailor has not moved", () => {
    const { container } = render(<LocationChangeBadge change={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("asks for review on a pending report — the actionable state here", () => {
    render(<LocationChangeBadge change={change({ state: "report_pending", report_id: "r-1" })} />);
    expect(screen.getByText(M.REPORT_PENDING)).toBeInTheDocument();
  });

  it("states a dismissal without asking for anything", () => {
    render(
      <LocationChangeBadge change={change({ state: "report_dismissed", report_id: "r-1" })} />,
    );
    expect(screen.getByText(M.REPORT_DISMISSED)).toBeInTheDocument();
  });

  it("shows the surcharge amount, formatted", () => {
    render(
      <LocationChangeBadge
        change={change({ state: "delta_pending", delta_id: "d-1", amount: "450.00" })}
      />,
    );
    expect(screen.getByText(M.DELTA_PENDING("$450.00"))).toBeInTheDocument();
  });

  it("distinguishes a delta being paid from one nobody has touched", () => {
    render(
      <LocationChangeBadge
        change={change({ state: "delta_initiated", delta_id: "d-1", amount: "450.00" })}
      />,
    );
    expect(screen.getByText(M.DELTA_INITIATED("$450.00"))).toBeInTheDocument();
  });

  it("still labels a delta that arrives without its amount", () => {
    render(<LocationChangeBadge change={change({ state: "delta_pending", delta_id: "d-1" })} />);
    expect(screen.getByText(M.DELTA_NO_AMOUNT)).toBeInTheDocument();
  });

  it("shows an unparseable amount as sent rather than as NaN", () => {
    render(
      <LocationChangeBadge
        change={change({ state: "delta_pending", delta_id: "d-1", amount: "n/a" })}
      />,
    );
    expect(screen.getByText(M.DELTA_PENDING("n/a"))).toBeInTheDocument();
  });
});
