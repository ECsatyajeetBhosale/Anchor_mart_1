import { MESSAGES } from "@/lib/messages";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CountryCodeSelect } from "./CountryCodeSelect";

const M = MESSAGES.COMMON.COUNTRY_CODE_SELECT;

/** The trigger, which is the only control on screen while the list is shut. */
const trigger = () => screen.getByRole("button", { name: M.LABEL });

const search = () => screen.getByLabelText(M.SEARCH_PLACEHOLDER);

function type(value: string) {
  fireEvent.change(search(), { target: { value } });
}

/**
 * Every row currently mounted.
 *
 * The trigger does not need excluding: the list is a *modal* popover, so
 * opening it marks everything outside `aria-hidden`, and role queries skip
 * hidden nodes.
 */
function rows() {
  return screen.getAllByRole("button");
}

/** Closes the list the way Escape does, from the layer that owns the key. */
function pressEscape() {
  fireEvent.keyDown(document, { key: "Escape" });
}

describe("CountryCodeSelect", () => {
  it("shows the country behind a stored prefix", () => {
    render(<CountryCodeSelect value="+91" onChange={vi.fn()} />);
    expect(trigger()).toHaveTextContent("+91");
    expect(trigger()).toHaveAttribute("title", "India (+91)");
  });

  it("resolves real artwork rather than an empty box", () => {
    // The flags are pulled out of `flag-icons` as files, on purpose — its
    // stylesheet would collide with this app's own `.fi`/`.fi-il`/`.fi-ir`. That
    // makes the lookup ours to get right, so assert it actually resolved.
    render(<CountryCodeSelect value="+91" onChange={vi.fn()} />);
    const flag = trigger().querySelector("img");
    expect(flag?.getAttribute("src") ?? "").toMatch(/\/in(-[^/]*)?\.svg$/);
  });

  it("shows the country behind a prefix stored without its plus", () => {
    // The API has returned both forms; a field that opened blank on the bare
    // one would read as a record with no country code.
    render(<CountryCodeSelect value="65" onChange={vi.fn()} />);
    expect(trigger()).toHaveTextContent("+65");
  });

  it("falls back to the raw value when no country owns the prefix", () => {
    render(<CountryCodeSelect value="+999" onChange={vi.fn()} />);
    expect(trigger()).toHaveTextContent("+999");
  });

  it("hands back the dialling prefix of the country picked", () => {
    const onChange = vi.fn();
    render(<CountryCodeSelect value="+91" onChange={onChange} />);

    fireEvent.click(trigger());
    type("singapore");
    fireEvent.click(screen.getByRole("button", { name: /Singapore/ }));

    expect(onChange).toHaveBeenCalledWith("+65");
  });

  it("searches by dialling code as well as by name", () => {
    const onChange = vi.fn();
    render(<CountryCodeSelect value="" onChange={onChange} />);

    fireEvent.click(trigger());
    // An operator who knows the code but not how the country is spelled.
    type("971");
    fireEvent.click(screen.getByRole("button", { name: /United Arab Emirates/ }));

    expect(onChange).toHaveBeenCalledWith("+971");
  });

  it("selects the highlighted row on Enter", () => {
    const onChange = vi.fn();
    render(<CountryCodeSelect value="" onChange={onChange} />);

    fireEvent.click(trigger());
    type("+65");
    fireEvent.keyDown(search(), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("+65");
  });

  it("says so when nothing matches", () => {
    render(<CountryCodeSelect value="+91" onChange={vi.fn()} />);
    fireEvent.click(trigger());
    type("zzzz");
    expect(screen.getByText(M.NO_MATCHES)).toBeInTheDocument();
  });

  it("offers a way back to blank only where blank is legal", () => {
    const onChange = vi.fn();
    const { rerender } = render(<CountryCodeSelect value="+91" onChange={onChange} />);

    fireEvent.click(trigger());
    expect(screen.queryByRole("button", { name: M.NONE })).not.toBeInTheDocument();
    pressEscape();

    rerender(<CountryCodeSelect value="+91" onChange={onChange} allowEmpty />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("button", { name: M.NONE }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("renders a window of the list rather than all 245 rows", () => {
    render(<CountryCodeSelect value="+91" onChange={vi.fn()} />);
    fireEvent.click(trigger());

    // Every flag is a separate request, so opening the list must not mount the
    // whole catalogue. The window plus overscan is well under a hundred rows.
    expect(rows().length).toBeGreaterThan(5);
    expect(rows().length).toBeLessThan(40);
    // …and the rows it does mount are the top of the list, not a random slice.
    expect(screen.getByRole("button", { name: /Afghanistan/ })).toBeInTheDocument();
  });

  it("reports the field as left when the list closes", () => {
    const onBlur = vi.fn();
    render(<CountryCodeSelect value="+91" onChange={vi.fn()} onBlur={onBlur} />);

    fireEvent.click(trigger());
    pressEscape();
    expect(onBlur).toHaveBeenCalled();
  });

  it("opens as a modal layer, which is what lets the list scroll", () => {
    // Not decoration. Every caller renders this inside a drawer, and a drawer's
    // scroll lock cancels wheel events raised outside its own subtree — which a
    // portalled popover is. A modal popover brings its own lock and takes over,
    // so the rows scroll instead of only being clickable.
    //
    // Modality is asserted through what it does to the page: everything outside
    // the open list, the trigger included, is hidden from assistive tech.
    render(<CountryCodeSelect value="+91" onChange={vi.fn()} />);
    const button = trigger();

    fireEvent.click(button);
    // Still rendered, but `hideOthers()` has taken everything outside the open
    // list out of the accessibility tree — so a role query no longer sees it.
    expect(button).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: M.LABEL })).toBeNull();

    pressEscape();
    expect(trigger()).toBe(button);
  });
});
