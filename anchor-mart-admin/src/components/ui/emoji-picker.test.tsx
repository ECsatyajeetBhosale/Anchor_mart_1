import { MESSAGES } from "@/lib/messages";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmojiPicker } from "./emoji-picker";

const M = MESSAGES.COMMON.EMOJI_PICKER;

/**
 * A stand-in Emojibase payload: two groups, so a category filter has something
 * to exclude. Shaped like the real records — the loader reads `group`,
 * `version`, `emoji`, `label` and `tags`, and ignores the rest.
 */
const DATA = [
  { group: 0, order: 1, version: 1, emoji: "😀", label: "grinning face", tags: ["grin"] },
  { group: 0, order: 2, version: 1, emoji: "😅", label: "grinning face with sweat", tags: [] },
  { group: 3, order: 1, version: 1, emoji: "🐻", label: "bear", tags: ["animal"] },
  // Newer than the version ceiling, so it should never be rendered: on a
  // machine whose fonts predate it, it draws as a tofu box.
  { group: 3, order: 2, version: 99, emoji: "🫎", label: "moose", tags: [] },
];

beforeEach(() => {
  // The loader memoises at module scope, so each test needs a fresh module
  // registry or the second one asserts against the first one's fetch.
  vi.resetModules();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(DATA), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
});

/** Re-imports the picker so it picks up a fresh, unmemoised loader. */
async function freshPicker() {
  const { EmojiPicker: Fresh } = await import("./emoji-picker");
  return Fresh;
}

describe("EmojiPicker", () => {
  it("offers a jump tab for every Emojibase group", () => {
    render(<EmojiPicker onSelect={vi.fn()} />);

    for (const label of Object.values(M.CATEGORY)) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("shows only the active category, not every emoji", async () => {
    const Fresh = await freshPicker();
    render(<Fresh onSelect={vi.fn()} />);

    // Smileys is the opening category, so the bear must not be on screen —
    // this is the whole point of filtering rather than scrolling one long list.
    await waitFor(() => expect(screen.getByRole("button", { name: "grinning face" })));
    expect(screen.queryByRole("button", { name: "bear" })).not.toBeInTheDocument();
  });

  it("swaps the grid when another category is picked", async () => {
    const Fresh = await freshPicker();
    render(<Fresh onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "grinning face" })));
    fireEvent.click(screen.getByRole("button", { name: M.CATEGORY.ANIMALS }));

    expect(screen.getByRole("button", { name: "bear" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "grinning face" })).not.toBeInTheDocument();
  });

  it("searches across every category, not just the open one", async () => {
    const Fresh = await freshPicker();
    render(<Fresh onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "grinning face" })));
    // Typed while Smileys is open; the bear lives in Animals and must surface.
    fireEvent.change(screen.getByPlaceholderText(M.SEARCH_PLACEHOLDER), {
      target: { value: "bear" },
    });

    expect(screen.getByRole("button", { name: "bear" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "grinning face" })).not.toBeInTheDocument();
  });

  it("drops emoji newer than the supported version", async () => {
    const Fresh = await freshPicker();
    render(<Fresh onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "grinning face" })));
    fireEvent.click(screen.getByRole("button", { name: M.CATEGORY.ANIMALS }));

    expect(screen.queryByRole("button", { name: "moose" })).not.toBeInTheDocument();
  });

  it("hands the caller the character, not the emoji object", async () => {
    const Fresh = await freshPicker();
    const onSelect = vi.fn();
    render(<Fresh onSelect={onSelect} />);

    const grin = await waitFor(() => screen.getByRole("button", { name: "grinning face" }));
    fireEvent.click(grin);

    expect(onSelect).toHaveBeenCalledWith("😀");
  });
});
