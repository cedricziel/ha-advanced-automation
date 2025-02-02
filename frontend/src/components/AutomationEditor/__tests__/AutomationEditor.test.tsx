import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AutomationEditor } from "../index";
import { automationService } from "../../../services/automationService";
import { blocklyService } from "../../../services/blocklyService";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { BlocklyToolbox, WorkspaceState } from "../../../types/blockly";

// Mock the services
jest.mock("../../../services/automationService");
jest.mock("../../../services/blocklyService");

// Mock BlocklyEditor component since it's complex and has external dependencies
jest.mock("../../BlocklyEditor", () => {
  return {
    __esModule: true,
    default: jest.fn(({}) => {
      return <div data-testid="blockly-editor">Blockly Editor Mock</div>;
    }),
  };
});

// Mock StateChangeInspector component
jest.mock("../../StateChangeInspector", () => ({
  StateChangeInspector: () => <div>State Change Inspector Mock</div>,
}));

// Mock react-split
jest.mock("react-split", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="split-container">{children}</div>
  ),
}));

const mockToolboxConfig = {
  toolbox: {
    kind: "categoryToolbox",
    contents: [
      {
        kind: "category",
        name: "Test Category",
        contents: [],
      },
    ],
  } as BlocklyToolbox,
  blocks: [],
};

const mockAutomation = {
  id: "123",
  name: "Test Automation",
  description: "Test Description",
  enabled: true,
  version: 1,
  triggers: [],
  conditions: [],
  workspace: {} as WorkspaceState,
  created_at: "2024-02-01T12:00:00Z",
  updated_at: "2024-02-01T12:00:00Z",
};

describe("AutomationEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (blocklyService.getToolboxConfig as jest.Mock).mockResolvedValue(
      mockToolboxConfig
    );
  });

  const renderComponent = (path: string = "/automations/new") => {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/automations/new" element={<AutomationEditor />} />
          <Route path="/automations/:id/edit" element={<AutomationEditor />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("renders loading state initially", () => {
    renderComponent();
    expect(screen.getByText("Loading editor...")).toBeInTheDocument();
  });

  it("renders create automation form", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Create New Automation")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByText("Create Automation")).toBeInTheDocument();
  });

  it("renders edit automation form with existing data", async () => {
    (automationService.getAutomation as jest.Mock).mockResolvedValue(
      mockAutomation
    );
    renderComponent("/automations/123/edit");

    await waitFor(() => {
      expect(screen.getByText("Edit Automation")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(
      "Description"
    ) as HTMLInputElement;

    expect(nameInput.value).toBe("Test Automation");
    expect(descriptionInput.value).toBe("Test Description");
    expect(screen.getByText("Update Automation")).toBeInTheDocument();
  });

  it("handles form submission for new automation", async () => {
    (automationService.createAutomation as jest.Mock).mockResolvedValue(
      mockAutomation
    );
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New Automation" },
    });

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "New Description" },
    });

    fireEvent.click(screen.getByText("Create Automation"));

    await waitFor(() => {
      expect(automationService.createAutomation).toHaveBeenCalled();
    });
  });

  it("handles form submission for editing automation", async () => {
    (automationService.getAutomation as jest.Mock).mockResolvedValue(
      mockAutomation
    );
    (automationService.updateAutomation as jest.Mock).mockResolvedValue(
      mockAutomation
    );

    renderComponent("/automations/123/edit");

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Updated Automation" },
    });

    fireEvent.click(screen.getByText("Update Automation"));

    await waitFor(() => {
      expect(automationService.updateAutomation).toHaveBeenCalled();
    });
  });

  it("handles tab switching", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Details")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Raw JSON"));
    expect(screen.getByText(/null/)).toBeInTheDocument(); // Initial JSON state

    fireEvent.click(screen.getByText("State Changes"));
    expect(screen.getByText("State Change Inspector Mock")).toBeInTheDocument();
  });

  it("handles error state from toolbox loading", async () => {
    const errorMessage = "Failed to load toolbox";
    (blocklyService.getToolboxConfig as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("handles error state from automation loading", async () => {
    const errorMessage = "Failed to load automation";
    (automationService.getAutomation as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    renderComponent("/automations/123/edit");

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("handles cancel button click", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cancel"));
    // Navigation would be tested in integration tests
  });

  it("toggles enabled state in edit mode", async () => {
    (automationService.getAutomation as jest.Mock).mockResolvedValue(
      mockAutomation
    );

    renderComponent("/automations/123/edit");

    await waitFor(() => {
      expect(screen.getByLabelText("Enabled")).toBeInTheDocument();
    });

    const enabledSwitch = screen.getByLabelText("Enabled") as HTMLInputElement;
    expect(enabledSwitch.checked).toBe(true);

    fireEvent.click(enabledSwitch);
    expect(enabledSwitch.checked).toBe(false);
  });
});
