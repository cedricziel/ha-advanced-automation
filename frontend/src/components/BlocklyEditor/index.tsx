import * as React from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { BlocklyToolbox, WorkspaceState } from "../../types/blockly";
import "./BlocklyEditor.css";

// Import Blockly and its components
import * as Blockly from "blockly/core";
import "blockly/blocks";
import "blockly/javascript";
import * as En from "blockly/msg/en";
import "../../extensions/entity_state_extension";
import "../../extensions/field_entity";
import "../../extensions/field_action";
import { registerFieldMultilineInput } from "@blockly/field-multilineinput";

import {
  ContinuousToolbox,
  ContinuousFlyout,
  ContinuousMetrics,
} from "@blockly/continuous-toolbox";

// Ensure Blockly is available globally
declare global {
  interface Window {
    Blockly: typeof Blockly;
  }
}
window.Blockly = Blockly;

interface BlocklyEditorProps {
  initialState?: WorkspaceState;
  value?: WorkspaceState;
  onError?: (error: Error) => void;
  toolbox?: BlocklyToolbox;
  readOnly?: boolean;
  workspaceConfiguration?: any;
}

interface BlocklyEditorState {
  error: string | null;
  workspace: any | null;
  isBlocklyLoaded: boolean;
  isWorkspaceInitialized: boolean;
  hasUnsavedChanges: boolean;
}

class BlocklyEditor extends React.Component<
  BlocklyEditorProps,
  BlocklyEditorState
> {
  private blocklyDiv: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  constructor(props: BlocklyEditorProps) {
    super(props);
    this.state = {
      error: null,
      workspace: null,
      isBlocklyLoaded: false,
      isWorkspaceInitialized: false,
      hasUnsavedChanges: false,
    };
  }

  private registerCategoryStyles() {
    const styles = {
      logic_category: { colour: "#5b80a5" },
      loop_category: { colour: "#5ba55b" },
      math_category: { colour: "#5b67a5" },
      text_category: { colour: "#5ba58c" },
      list_category: { colour: "#745ba5" },
      variable_category: { colour: "#a55b80" },
      procedure_category: { colour: "#995ba5" },
      trigger_category: { colour: "#e65100" },
      condition_category: { colour: "#33691e" },
      action_category: { colour: "#1565c0" },
    };

    Object.entries(styles).forEach(([name, style]) => {
      if (!window.Blockly.registry.hasItem("categoryStyle", name)) {
        window.Blockly.registry.register("categoryStyle", name, style);
      }
    });
  }

  componentDidMount() {
    console.log("BlocklyEditor mounting...");
    this.checkBlocklyAvailability();
  }

  componentWillUnmount() {
    this.disposeWorkspace();
    this.cleanupResizeObserver();
  }

  componentDidUpdate(prevProps: BlocklyEditorProps) {
    // Initialize workspace if we have both div and toolbox
    if (
      !this.state.isWorkspaceInitialized &&
      this.blocklyDiv &&
      this.props.toolbox
    ) {
      this.initializeWorkspace();
    }

    // Only handle updates if workspace is initialized
    if (this.state.isWorkspaceInitialized && this.state.workspace) {
      // Handle toolbox updates
      if (this.props.toolbox !== prevProps.toolbox) {
        console.log("Toolbox changed, updating...");
        this.updateToolbox();
      }

      // Handle value updates, but only if it's not the initial load
      if (
        this.props.value !== prevProps.value &&
        prevProps.value !== undefined
      ) {
        console.log("Value changed, loading new state...");
        this.loadWorkspaceState();
      }
    }
  }

  private checkBlocklyAvailability() {
    console.log("Checking Blockly availability...");

    if (typeof window.Blockly === "undefined") {
      const error = "Blockly failed to load - window.Blockly is undefined";
      console.error(error);
      this.setState({ error });
      return false;
    }

    if (!window.Blockly.Blocks) {
      const error = "Blockly blocks module not loaded";
      console.error(error);
      this.setState({ error });
      return false;
    }

    if (!window.Blockly.registry) {
      const error = "Blockly registry not available";
      console.error(error);
      this.setState({ error });
      return false;
    }

    console.log("Blockly is available");
    this.setState({ isBlocklyLoaded: true });
    return true;
  }

  private initializeWorkspace() {
    console.log("Initializing Blockly workspace...");

    if (!this.blocklyDiv || !this.props.toolbox) {
      console.log("Missing required elements:", {
        hasBlocklyDiv: !!this.blocklyDiv,
        hasToolbox: !!this.props.toolbox,
      });
      return;
    }

    try {
      this.registerCategoryStyles();
      this.registerBlocks();

      const config = {
        ...this.getWorkspaceConfig(),
        plugins: {
          toolbox: ContinuousToolbox,
          flyoutsVerticalToolbox: ContinuousFlyout,
          metricsManager: ContinuousMetrics,
        },
        readOnly: this.props.readOnly,
        toolbox: this.props.toolbox,
      };

      console.log("Injecting Blockly workspace...");
      const workspace = window.Blockly.inject(this.blocklyDiv, config);
      console.log("Workspace created:", workspace);

      // Set Blockly language

      registerFieldMultilineInput();

      workspace.addChangeListener(() => {
        if (this.state.workspace) {
          this.setState({ hasUnsavedChanges: true });
        }
      });

      this.setState({ workspace, isWorkspaceInitialized: true }, () => {
        this.setupResizeObserver();
        this.loadWorkspaceState();
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error initializing workspace:", error);
      this.setState({
        error: `Failed to initialize Blockly workspace: ${errorMessage}`,
      });
    }
  }

  private registerBlocks() {
    if (!this.props.toolbox?.blocks) {
      console.log("No blocks to register in toolbox");
      return;
    }

    console.log(
      "Starting block registration, total blocks:",
      this.props.toolbox.blocks.length
    );

    this.props.toolbox.blocks.forEach((blockDef) => {
      console.log("Processing block:", {
        type: blockDef.type,
        exists: !!window.Blockly.Blocks[blockDef.type],
      });

      if (!window.Blockly.Blocks[blockDef.type]) {
        try {
          window.Blockly.Blocks[blockDef.type] = {
            init: function () {
              console.log(`Initializing block: ${blockDef.type}`);
              try {
                this.jsonInit(blockDef);
                console.log(`Successfully initialized block: ${blockDef.type}`);
              } catch (error) {
                console.error(
                  `Failed to initialize block ${blockDef.type}:`,
                  error
                );
                throw error;
              }
            },
          };
          console.log(`Registered block: ${blockDef.type}`);
        } catch (error) {
          console.error(`Failed to register block ${blockDef.type}:`, error);
          throw error;
        }
      } else {
        console.log(`Block ${blockDef.type} already registered, skipping`);
      }
    });

    console.log(
      "Block registration complete. Registered blocks:",
      Object.keys(window.Blockly.Blocks)
    );
  }

  private getWorkspaceConfig() {
    return {
      grid: {
        spacing: 20,
        length: 3,
        colour: "#ccc",
        snap: true,
      },
      move: {
        scrollbars: true,
        drag: true,
        wheel: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
      trashcan: true,
      ...this.props.workspaceConfiguration,
    };
  }

  private updateToolbox() {
    console.log("Starting toolbox update...");

    if (!this.state.workspace || !this.props.toolbox) {
      console.log("Missing requirements for toolbox update:", {
        hasWorkspace: !!this.state.workspace,
        hasToolbox: !!this.props.toolbox,
      });
      return;
    }

    try {
      console.log(
        "Current blocks in registry:",
        Object.keys(window.Blockly.Blocks)
      );

      // Only register/update custom blocks (skip built-in blocks)
      console.log("Registering/updating custom blocks...");
      if (this.props.toolbox?.blocks) {
        const standardPrefixes = [
          "logic_",
          "controls_",
          "math_",
          "text_",
          "lists_",
        ];
        const customBlocks = this.props.toolbox.blocks.filter(
          (block) =>
            !standardPrefixes.some((prefix) => block.type.startsWith(prefix))
        );
        this.props.toolbox.blocks = customBlocks;
        this.registerBlocks();
      }

      // Update toolbox
      console.log(
        "Updating workspace toolbox with new configuration:",
        this.props.toolbox
      );
      try {
        this.state.workspace.updateToolbox(this.props.toolbox);
        console.log("Toolbox updated successfully");
      } catch (updateError) {
        console.error("Failed to update workspace toolbox:", updateError);
        throw new Error(
          `Toolbox update failed: ${
            updateError instanceof Error ? updateError.message : "Unknown error"
          }`
        );
      }

      console.log("Toolbox update completed successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error updating toolbox:", {
        error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      this.setState({
        error: `Failed to update Blockly toolbox: ${errorMessage}`,
      });
    }
  }

  public getWorkspaceState(): WorkspaceState | null {
    console.log("Getting workspace state...");

    if (!this.state.workspace) {
      console.log("No workspace available");
      return null;
    }

    try {
      console.log("Serializing workspace blocks...");
      const blocks = window.Blockly.serialization.workspaces.save(
        this.state.workspace
      );
      console.log("Serialized blocks:", blocks);

      console.log("Getting workspace variables...");
      const variables = this.state.workspace.getAllVariables();
      console.log("Raw variables:", variables);

      const mappedVariables = variables.map(
        (v: { getId: () => string; name: string; type: string }) => ({
          id: v.getId(),
          name: v.name,
          type: v.type,
        })
      );
      console.log("Processed variables:", mappedVariables);

      const state: WorkspaceState = {
        blocks,
        variables: mappedVariables,
      };
      console.log("Final workspace state:", state);

      this.setState({ hasUnsavedChanges: false });
      return state;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error getting workspace state:", {
        error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (this.props.onError) {
        const errorObj =
          error instanceof Error
            ? error
            : new Error("Failed to get workspace state");
        this.props.onError(errorObj);
      }
      return null;
    }
  }

  private loadWorkspaceState() {
    console.log("Loading workspace state...");

    if (!this.state.workspace) {
      console.log("No workspace available, skipping state load");
      return;
    }

    const state = this.props.value || this.props.initialState;
    console.log("Raw workspace state:", JSON.stringify(state));

    console.log("State to load:", {
      hasValue: !!this.props.value,
      hasInitialState: !!this.props.initialState,
      finalState: state,
    });

    if (!state) {
      console.log("No state to load, skipping");
      return;
    }

    try {
      console.log("Clearing existing workspace");
      this.state.workspace.clear();

      console.log("Loading blocks from state:", state.blocks);
      try {
        window.Blockly.serialization.workspaces.load(
          state.blocks,
          this.state.workspace
        );
        console.log("Successfully loaded blocks");
      } catch (blockError) {
        console.error("Failed to load blocks:", blockError);
        throw new Error(
          `Block loading failed: ${
            blockError instanceof Error ? blockError.message : "Unknown error"
          }`
        );
      }

      // Load variables
      if (state.variables) {
        console.log("Loading variables:", state.variables);
        state.variables.forEach((variable) => {
          console.log("Processing variable:", variable);
          if (!this.state.workspace.getVariableById(variable.id)) {
            try {
              const newVar = this.state.workspace.createVariable(
                variable.name,
                variable.type,
                variable.id
              );
              console.log("Created variable:", newVar);
            } catch (varError) {
              console.error(
                `Failed to create variable ${variable.name}:`,
                varError
              );
              throw new Error(
                `Variable creation failed for ${variable.name}: ${
                  varError instanceof Error ? varError.message : "Unknown error"
                }`
              );
            }
          } else {
            console.log(`Variable ${variable.name} already exists, skipping`);
          }
        });
        console.log("Finished loading variables");
      } else {
        console.log("No variables to load");
      }

      console.log("Workspace state loaded successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error loading workspace state:", {
        error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      this.setState({
        error: `Failed to load workspace state: ${errorMessage}`,
      });
    }
  }

  private setupResizeObserver() {
    if (!this.blocklyDiv) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (this.state.workspace) {
        window.Blockly.svgResize(this.state.workspace);
      }
    });

    this.resizeObserver.observe(this.blocklyDiv);
  }

  private cleanupResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  private disposeWorkspace() {
    if (this.state.workspace) {
      this.state.workspace.dispose();
    }
  }

  render() {
    console.log("BlocklyEditor render state:", {
      ...this.state,
      hasBlocklyDiv: !!this.blocklyDiv,
      hasToolbox: !!this.props.toolbox,
    });

    return (
      <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
        <div
          ref={(el: HTMLDivElement | null) => {
            this.blocklyDiv = el;
          }}
          style={{
            width: "100%",
            height: "100%",
            minHeight: "300px",
            display: this.state.isBlocklyLoaded ? "block" : "none",
          }}
        />

        {!this.state.isWorkspaceInitialized && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
            }}
          >
            <CircularProgress />
          </Box>
        )}

        <Dialog
          open={!!this.state.error}
          onClose={() => this.setState({ error: null })}
        >
          <DialogTitle>Error</DialogTitle>
          <DialogContent>
            <Alert severity="error">{this.state.error}</Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => this.setState({ error: null })}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
}

export default BlocklyEditor;
