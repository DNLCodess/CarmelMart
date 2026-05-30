import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BankSelect from "@/components/ui/BankSelect";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setup(props = {}) {
  const onChange = props.onChange ?? vi.fn();
  const user     = userEvent.setup();
  const utils    = render(<BankSelect value={props.value ?? ""} onChange={onChange} error={props.error} />);
  const input    = screen.getByPlaceholderText(/search for your bank/i);
  return { user, input, onChange, ...utils };
}

// ─── Initial render ───────────────────────────────────────────────────────────

describe("BankSelect — initial render", () => {
  it("renders the search input with correct placeholder", () => {
    setup();
    expect(screen.getByPlaceholderText(/search for your bank/i)).toBeInTheDocument();
  });

  it("shows the bank label with required asterisk", () => {
    setup();
    expect(screen.getByText("Bank")).toBeInTheDocument();
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("shows no dropdown when not focused", () => {
    setup();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows selected bank name in input when value is provided", () => {
    setup({ value: "044" }); // Access Bank
    expect(screen.getByPlaceholderText(/search for your bank/i)).toHaveValue("Access Bank");
  });

  it("shows empty input when value is empty string", () => {
    setup({ value: "" });
    expect(screen.getByPlaceholderText(/search for your bank/i)).toHaveValue("");
  });

  it("renders error message when error prop is provided", () => {
    setup({ error: "Please select your bank" });
    expect(screen.getByText("Please select your bank")).toBeInTheDocument();
  });

  it("applies error styling to input when error prop is set", () => {
    setup({ error: "Required" });
    const input = screen.getByPlaceholderText(/search for your bank/i);
    expect(input.className).toMatch(/border-red/);
  });
});

// ─── Dropdown open / close ────────────────────────────────────────────────────

describe("BankSelect — dropdown open/close", () => {
  it("opens dropdown on focus showing all banks", async () => {
    const { user, input } = setup();
    await user.click(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // All banks listed (Access Bank is one of them)
    expect(screen.getByRole("option", { name: /access bank/i })).toBeInTheDocument();
  });

  it("clears the input text when dropdown opens (shows query mode)", async () => {
    const { user, input } = setup({ value: "044" });
    // Input shows bank name when closed
    expect(input).toHaveValue("Access Bank");
    await user.click(input);
    // Query is reset to empty when opened
    expect(input).toHaveValue("");
  });

  it("closes dropdown on Escape key", async () => {
    const { user, input } = setup();
    await user.click(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

// ─── Filtering ────────────────────────────────────────────────────────────────

describe("BankSelect — filtering", () => {
  it("filters banks by typed text", async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.type(input, "kuda");

    expect(screen.getByRole("option", { name: /kuda bank/i })).toBeInTheDocument();
    // Non-matching banks should not appear
    expect(screen.queryByRole("option", { name: /access bank/i })).not.toBeInTheDocument();
  });

  it("shows 'No banks found' message when query matches nothing", async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.type(input, "xyzxyzxyz");

    expect(screen.getByText(/no banks found/i)).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).toBeInTheDocument(); // listbox still present
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("is case-insensitive when filtering", async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.type(input, "GTBANK");

    expect(screen.getByRole("option", { name: /guaranty trust bank/i })).toBeInTheDocument();
  });

  it("restores full list after clearing the typed query", async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.type(input, "kuda");
    // Only kuda visible
    expect(screen.getAllByRole("option")).toHaveLength(1);

    await user.clear(input);
    // All banks visible again
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);
  });
});

// ─── Selection ────────────────────────────────────────────────────────────────

describe("BankSelect — selection", () => {
  it("calls onChange with bank code and name when an option is clicked", async () => {
    const { user, input, onChange } = setup();
    await user.click(input);

    const accessBankOption = screen.getByRole("option", { name: /access bank/i });
    await user.pointer({ keys: "[MouseLeft>]", target: accessBankOption });

    expect(onChange).toHaveBeenCalledWith("044", "Access Bank");
  });

  it("closes the dropdown after selection", async () => {
    const { user, input } = setup();
    await user.click(input);
    const option = screen.getByRole("option", { name: /access bank/i });
    await user.pointer({ keys: "[MouseLeft>]", target: option });

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("marks the currently selected bank with aria-selected", async () => {
    const { user, input } = setup({ value: "044" });
    await user.click(input);

    const selectedOption = screen.getByRole("option", { name: /access bank/i });
    expect(selectedOption).toHaveAttribute("aria-selected", "true");
  });
});

// ─── Clear button ─────────────────────────────────────────────────────────────

describe("BankSelect — clear button", () => {
  it("shows clear button when a bank is selected and dropdown is closed", () => {
    setup({ value: "044" });
    expect(screen.getByLabelText("Clear selection")).toBeInTheDocument();
  });

  it("does not show clear button when no bank is selected", () => {
    setup({ value: "" });
    expect(screen.queryByLabelText("Clear selection")).not.toBeInTheDocument();
  });

  it("calls onChange with empty strings when clear button is clicked", async () => {
    const { user, onChange } = setup({ value: "044" });
    const clearBtn = screen.getByLabelText("Clear selection");
    await user.pointer({ keys: "[MouseLeft>]", target: clearBtn });

    expect(onChange).toHaveBeenCalledWith("", "");
  });
});
