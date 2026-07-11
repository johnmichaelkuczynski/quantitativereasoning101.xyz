import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { devCallbackUrl, isFramed, launchGoogleLogin } from "@/lib/auth";
import { SignInScreen } from "@/lib/auth";

const AUTH_URL = `${window.location.origin}/api/auth/google`;

function simulateFramed(): () => void {
  const original = window.self;
  Object.defineProperty(window, "self", {
    value: {} as Window,
    writable: true,
    configurable: true,
  });
  return () => {
    Object.defineProperty(window, "self", {
      value: original,
      writable: true,
      configurable: true,
    });
  };
}

describe("isFramed", () => {
  it("is false when the app is the top-level window", () => {
    expect(isFramed()).toBe(false);
  });

  it("is true when window.self differs from window.top", () => {
    const restore = simulateFramed();
    try {
      expect(isFramed()).toBe(true);
    } finally {
      restore();
    }
  });
});

describe("devCallbackUrl", () => {
  it("points at /auth/google/callback on the current host", () => {
    expect(devCallbackUrl()).toBe(
      `https://${window.location.host}/auth/google/callback`,
    );
  });
});

describe("launchGoogleLogin", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, "open");
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it("framed: opens /api/auth/google in a new tab instead of navigating in-frame", () => {
    const fakeTab = { opener: {} } as unknown as Window;
    openSpy.mockReturnValue(fakeTab);
    const restore = simulateFramed();
    try {
      const mode = launchGoogleLogin();
      expect(mode).toBe("newTab");
      expect(openSpy).toHaveBeenCalledTimes(1);
      expect(openSpy).toHaveBeenCalledWith(AUTH_URL, "_blank");
      expect((fakeTab as { opener: unknown }).opener).toBeNull();
    } finally {
      restore();
    }
  });

  it('framed: must NOT pass a "noopener" feature string (it makes window.open return null and breaks new-tab detection)', () => {
    openSpy.mockReturnValue({ opener: null } as unknown as Window);
    const restore = simulateFramed();
    try {
      launchGoogleLogin();
      const featureArg = openSpy.mock.calls[0]?.[2];
      expect(featureArg).toBeUndefined();
    } finally {
      restore();
    }
  });

  it("framed: falls back to same-tab navigation when the popup is blocked", () => {
    openSpy.mockReturnValue(null);
    const restore = simulateFramed();
    try {
      expect(launchGoogleLogin()).toBe("sameTab");
      expect(openSpy).toHaveBeenCalledWith(AUTH_URL, "_blank");
    } finally {
      restore();
    }
  });

  it("unframed: navigates in the same tab without calling window.open", () => {
    const mode = launchGoogleLogin();
    expect(mode).toBe("sameTab");
    expect(openSpy).not.toHaveBeenCalled();
  });
});

describe("SignInScreen waiting state", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;
  let restoreFramed: (() => void) | null = null;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ authenticated: false }),
      }),
    );
    openSpy = vi.spyOn(window, "open");
  });

  afterEach(() => {
    cleanup();
    restoreFramed?.();
    restoreFramed = null;
    openSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("framed: clicking Sign in with Google opens a new tab and shows the waiting state with refresh button and callback-URL hint", async () => {
    openSpy.mockReturnValue({ opener: {} } as unknown as Window);
    restoreFramed = simulateFramed();
    const user = userEvent.setup();

    render(<SignInScreen />);

    expect(screen.queryByTestId("status-waiting-signin")).toBeNull();
    expect(screen.queryByTestId("text-callback-url")).toBeNull();

    await user.click(screen.getByTestId("button-login"));

    expect(openSpy).toHaveBeenCalledWith(AUTH_URL, "_blank");

    const waiting = screen.getByTestId("status-waiting-signin");
    expect(waiting.textContent).toContain(
      "Waiting for you to finish signing in with Google",
    );
    expect(screen.getByTestId("button-refresh-signin")).toBeTruthy();
    expect(screen.getByTestId("text-callback-url").textContent).toBe(
      `https://${window.location.host}/auth/google/callback`,
    );
    expect(screen.getByTestId("button-copy-callback")).toBeTruthy();
  });

  it("framed: popup blocked keeps the waiting state hidden (falls back to same-tab navigation)", async () => {
    openSpy.mockReturnValue(null);
    restoreFramed = simulateFramed();
    const user = userEvent.setup();

    render(<SignInScreen />);
    await user.click(screen.getByTestId("button-login"));

    expect(screen.queryByTestId("status-waiting-signin")).toBeNull();
  });

  it("unframed: clicking Sign in with Google never calls window.open and shows no waiting state", async () => {
    const user = userEvent.setup();

    render(<SignInScreen />);
    await user.click(screen.getByTestId("button-login"));

    expect(openSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("status-waiting-signin")).toBeNull();
  });
});
