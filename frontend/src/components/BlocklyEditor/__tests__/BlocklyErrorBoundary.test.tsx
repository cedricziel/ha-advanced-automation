import { render, screen, fireEvent } from "@testing-library/react";
import { BlocklyErrorBoundary } from "../BlocklyErrorBoundary";

// Mock console.error to prevent test output pollution
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe("BlocklyErrorBoundary", () => {
  const ThrowError = ({ shouldThrow = false }) => {
    if (shouldThrow) {
      throw new Error("Test error");
    }
    return <div>Child Component</div>;
  };

  it("renders children when there is no error", () => {
    render(
      <BlocklyErrorBoundary>
        <div>Test Content</div>
      </BlocklyErrorBoundary>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("displays error message when child component throws", () => {
    render(
      <BlocklyErrorBoundary>
        <ThrowError shouldThrow={true} />
      </BlocklyErrorBoundary>
    );

    expect(
      screen.getByText("The Blockly editor encountered an error")
    ).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  it("provides retry functionality", () => {
    const { rerender } = render(
      <BlocklyErrorBoundary>
        <ThrowError shouldThrow={true} />
      </BlocklyErrorBoundary>
    );

    // Verify error state
    expect(
      screen.getByText("The Blockly editor encountered an error")
    ).toBeInTheDocument();

    // Click retry button
    fireEvent.click(screen.getByText("Retry"));

    // Update the child to not throw
    rerender(
      <BlocklyErrorBoundary>
        <ThrowError shouldThrow={false} />
      </BlocklyErrorBoundary>
    );

    // Verify recovery
    expect(screen.getByText("Child Component")).toBeInTheDocument();
  });

  it("shows error details in development mode", () => {
    const originalEnv = import.meta.env.DEV;
    // Mock development environment
    Object.defineProperty(import.meta.env, "DEV", {
      value: true,
      writable: true,
    });

    render(
      <BlocklyErrorBoundary>
        <ThrowError shouldThrow={true} />
      </BlocklyErrorBoundary>
    );

    expect(
      screen.getByText("Error Details (Development Only):")
    ).toBeInTheDocument();

    // Restore original env
    Object.defineProperty(import.meta.env, "DEV", {
      value: originalEnv,
      writable: true,
    });
  });

  it("does not show error details in production mode", () => {
    const originalEnv = import.meta.env.DEV;
    // Mock production environment
    Object.defineProperty(import.meta.env, "DEV", {
      value: false,
      writable: true,
    });

    render(
      <BlocklyErrorBoundary>
        <ThrowError shouldThrow={true} />
      </BlocklyErrorBoundary>
    );

    expect(
      screen.queryByText("Error Details (Development Only):")
    ).not.toBeInTheDocument();

    // Restore original env
    Object.defineProperty(import.meta.env, "DEV", {
      value: originalEnv,
      writable: true,
    });
  });
});
