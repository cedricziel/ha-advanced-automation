import * as Blockly from "blockly/core";
import { haClient, EntityState } from "../services/haClient";

interface Entity {
  entityId: string;
  friendlyName: string;
  domain: string;
}

/**
 * Custom field for Home Assistant entity IDs with autocompletion
 */
export class FieldEntity extends Blockly.Field {
  private dropdownDiv: HTMLElement | null = null;
  private entities: Entity[] = [];
  private filteredEntities: Entity[] = [];
  private selectedIndex = -1;
  private isDropdownVisible = false;
  private boundHandleDocumentClick: (e: MouseEvent) => void;
  private textElement: SVGTextElement | null = null;
  protected size_: { height: number; width: number } = { height: 0, width: 0 };

  /**
   * Class constructor for the entity field.
   * @param {string=} value The initial value of the field. Should be a valid entity ID.
   * @param {Object=} _config A map of options used to configure the field.
   */
  constructor(value?: string, _config?: object) {
    super(value || "");
    this.SERIALIZABLE = true;
    this.CURSOR = "pointer";
    this.boundHandleDocumentClick = this.handleDocumentClick.bind(this);
    // Connect to HA and load entities
    haClient.connect().then(() => this.loadEntities());
  }

  /**
   * Initializes the field. Called by BlockSvg.render().
   */
  override init() {
    if (this.fieldGroup_) {
      // Already initialized once.
      return;
    }
    super.init();

    // Add specific click handler for our field
    if (this.fieldGroup_) {
      (this.fieldGroup_ as unknown as HTMLElement).addEventListener(
        "click",
        () => {
          this.showEditor_();
        }
      );
    }
  }

  /**
   * Create the DOM elements for the field.
   * @override
   */
  protected override initView() {
    super.initView();
    // Create the text element
    this.textElement = Blockly.utils.dom.createSvgElement(
      "text",
      {
        class: "blocklyText",
        x: 0,
        y: 12,
      },
      this.fieldGroup_!
    ) as SVGTextElement;
    this.textElement.textContent = this.getDisplayText_();
  }

  /**
   * Updates the field's display based on the current value.
   * @override
   */
  protected override render_() {
    if (!this.textElement) return;
    this.textElement.textContent = this.getDisplayText_();
    this.updateSize_();
  }

  /**
   * Get the text to display when not editing.
   * @returns {string} The text to display.
   * @override
   */
  protected override getDisplayText_(): string {
    const entity = this.entities.find((e) => e.entityId === this.getValue());
    return entity
      ? `${entity.friendlyName} (${entity.entityId})`
      : this.getValue() || "⌄ Select entity";
  }

  /**
   * Updates the size of the field based on the text.
   * @private
   */
  protected updateSize_() {
    const textWidth = this.textElement?.getComputedTextLength() ?? 0;
    this.size_.width = textWidth + 10; // Add padding
    this.size_.height = 24; // Standard height
  }

  /**
   * Show the editor for this field
   * @override
   */
  protected override showEditor_() {
    this.showDropdown_();
    document.addEventListener("click", this.boundHandleDocumentClick);

    // Handle keyboard events on document level since we don't have an input element
    const keyHandler = (e: KeyboardEvent) => {
      if (!this.isDropdownVisible) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          this.selectedIndex = Math.min(
            this.selectedIndex + 1,
            this.filteredEntities.length - 1
          );
          this.updateSelection_();
          break;
        case "ArrowUp":
          e.preventDefault();
          this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
          this.updateSelection_();
          break;
        case "Enter":
          e.preventDefault();
          if (
            this.selectedIndex >= 0 &&
            this.selectedIndex < this.filteredEntities.length
          ) {
            const entity = this.filteredEntities[this.selectedIndex];
            this.setValue(entity.entityId);
            this.hideDropdown_();
          }
          break;
        case "Escape":
          this.hideDropdown_();
          break;
      }
    };

    document.addEventListener("keydown", keyHandler);
    this.dropdownDiv?.addEventListener("remove", () => {
      document.removeEventListener("keydown", keyHandler);
    });
  }

  /**
   * Update the visual selection in the dropdown
   */
  private updateSelection_() {
    if (!this.dropdownDiv) return;

    // Remove previous selection
    const items = this.dropdownDiv.querySelectorAll("div:not(.domain)");
    items.forEach((item) => item.classList.remove("selected"));

    // Add new selection
    if (this.selectedIndex >= 0 && this.selectedIndex < items.length) {
      items[this.selectedIndex].classList.add("selected");
      // Scroll into view if needed
      items[this.selectedIndex].scrollIntoView({ block: "nearest" });
    }
  }

  /**
   * Load entities from Home Assistant
   */
  private async loadEntities() {
    try {
      const states = await haClient.getAllStates();
      this.entities = Object.entries(states).map(
        ([entityId, state]: [string, EntityState]) => ({
          entityId,
          friendlyName: state.attributes.friendly_name || entityId,
          domain: entityId.split(".")[0],
        })
      );

      // Sort entities by domain and then by friendly name
      this.entities.sort((a, b) => {
        if (a.domain !== b.domain) {
          return a.domain.localeCompare(b.domain);
        }
        return a.friendlyName.localeCompare(b.friendlyName);
      });

      // Subscribe to state changes to keep entities list updated
      haClient.onStateChanged((entityId: string, state: EntityState) => {
        const index = this.entities.findIndex((e) => e.entityId === entityId);
        if (index === -1) {
          // New entity
          this.entities.push({
            entityId,
            friendlyName: state.attributes.friendly_name || entityId,
            domain: entityId.split(".")[0],
          });
          this.entities.sort((a, b) => a.entityId.localeCompare(b.entityId));
        } else {
          // Update existing entity
          this.entities[index].friendlyName =
            state.attributes.friendly_name || entityId;
        }
      });

      // Re-render to show friendly name if available
      this.render_();
    } catch (error) {
      console.error("Failed to load entities:", error);
    }
  }

  /**
   * Handle document clicks to close dropdown when clicking outside
   */
  private handleDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (
      this.dropdownDiv &&
      !this.dropdownDiv.contains(target) &&
      !this.fieldGroup_?.contains(target)
    ) {
      this.hideDropdown_();
    }
  }

  /**
   * Show the dropdown with entity suggestions
   */
  private showDropdown_() {
    // Create dropdown if it doesn't exist
    if (!this.dropdownDiv) {
      this.dropdownDiv = document.createElement("div");
      this.dropdownDiv.className = "blocklyFieldEntityDropdown";
      document.body.appendChild(this.dropdownDiv);

      // Add styles if they don't exist
      if (!document.getElementById("blocklyFieldEntityStyles")) {
        const style = document.createElement("style");
        style.id = "blocklyFieldEntityStyles";
        style.textContent = `
          .blocklyFieldEntityDropdown {
            position: fixed;
            background: white;
            border: 1px solid #ccc;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            max-height: 200px;
            overflow-y: auto;
            z-index: 100000;
          }
          .blocklyFieldEntityDropdown div {
            padding: 4px 8px;
            cursor: pointer;
            white-space: nowrap;
          }
          .blocklyFieldEntityDropdown div:hover,
          .blocklyFieldEntityDropdown div.selected {
            background: #e8f0fe;
          }
          .blocklyFieldEntityDropdown .domain {
            font-weight: bold;
            color: #666;
            padding: 4px 8px;
            background: #f5f5f5;
            position: sticky;
            top: 0;
          }
          .blocklyFieldEntityDropdown .search {
            position: sticky;
            top: 0;
            background: white;
            padding: 8px;
            border-bottom: 1px solid #ccc;
          }
          .blocklyFieldEntityDropdown .search input {
            width: 100%;
            padding: 4px;
            border: 1px solid #ccc;
            border-radius: 4px;
          }
        `;
        document.head.appendChild(style);
      }
    }

    // Position dropdown below field
    const fieldRect = this.fieldGroup_?.getBoundingClientRect();
    if (fieldRect) {
      const dropdown = this.dropdownDiv;
      dropdown.style.left = `${fieldRect.left}px`;
      dropdown.style.top = `${fieldRect.bottom + 2}px`;
      dropdown.style.minWidth = `${Math.max(200, fieldRect.width)}px`;
      dropdown.style.display = "block";
    }

    // Add search input
    const searchDiv = document.createElement("div");
    searchDiv.className = "search";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search entities...";
    searchInput.value = this.getValue() || "";
    searchDiv.appendChild(searchInput);
    this.dropdownDiv.appendChild(searchDiv);

    // Focus search input and select text
    searchInput.focus();
    searchInput.select();

    // Handle search input
    searchInput.addEventListener("input", () => {
      const searchValue = searchInput.value.toLowerCase();
      this.filteredEntities = this.entities.filter(
        (entity) =>
          entity.entityId.toLowerCase().includes(searchValue) ||
          entity.friendlyName.toLowerCase().includes(searchValue)
      );
      this.updateDropdownContent_();
    });

    this.filteredEntities = [...this.entities];
    this.updateDropdownContent_();
    this.isDropdownVisible = true;
  }

  /**
   * Hide the dropdown
   */
  private hideDropdown_() {
    if (this.dropdownDiv && this.isDropdownVisible) {
      document.removeEventListener("click", this.boundHandleDocumentClick);
      this.dropdownDiv.remove();
      this.dropdownDiv = null;
      this.isDropdownVisible = false;
      this.selectedIndex = -1;
    }
  }

  /**
   * Update dropdown content based on filtered entities
   */
  private updateDropdownContent_() {
    const dropdown = this.dropdownDiv;
    if (!dropdown) return;

    // Keep the search div
    const searchDiv = dropdown.querySelector(".search");
    dropdown.innerHTML = "";
    if (searchDiv) {
      dropdown.appendChild(searchDiv);
    }

    if (this.filteredEntities.length === 0) {
      const noResults = document.createElement("div");
      noResults.textContent = "No matching entities found";
      dropdown.appendChild(noResults);
      return;
    }

    // Group entities by domain
    const groupedEntities = this.filteredEntities.reduce(
      (groups: Record<string, Entity[]>, entity) => {
        if (!groups[entity.domain]) {
          groups[entity.domain] = [];
        }
        groups[entity.domain].push(entity);
        return groups;
      },
      {}
    );

    Object.entries(groupedEntities).forEach(([domain, entities]) => {
      // Add domain header
      const domainDiv = document.createElement("div");
      domainDiv.className = "domain";
      domainDiv.textContent = domain;
      dropdown.appendChild(domainDiv);

      // Add entities
      entities.forEach((entity) => {
        const div = document.createElement("div");
        div.textContent = `${entity.friendlyName} (${entity.entityId})`;
        div.onclick = () => {
          this.setValue(entity.entityId);
          this.hideDropdown_();
        };
        dropdown.appendChild(div);
      });
    });
  }

  /**
   * Override dispose to clean up dropdown
   * @override
   */
  public override dispose() {
    this.hideDropdown_();
    super.dispose();
  }

  /**
   * Constructs a FieldEntity from a JSON arg object.
   * @param {!Object} options A JSON object with options.
   * @returns {!FieldEntity} The new field instance.
   * @package
   * @nocollapse
   */
  static fromJson(options: any): FieldEntity {
    return new FieldEntity(options["value"]);
  }

  /**
   * Validates the entity ID format.
   * @param {string} newValue The value to be validated.
   * @returns {string|null} The validated value (a string) or null if invalid.
   * @protected
   */
  protected override doClassValidation_(newValue: string): string | null {
    // Trim whitespace
    newValue = newValue.trim();

    // Don't allow empty values
    if (!newValue) {
      return null;
    }

    // Basic entity ID format validation (domain.entity)
    if (!newValue.includes(".")) {
      return null;
    }

    // Split into domain and entity_id
    const [domain, ...rest] = newValue.split(".");

    // Validate domain exists and entity_id is present
    if (!domain || rest.length === 0) {
      return null;
    }

    // Validate no spaces in entity ID
    if (newValue.includes(" ")) {
      return null;
    }

    return newValue;
  }
}

// Register the field with Blockly
// Register field with proper type casting
Blockly.fieldRegistry.register("field_entity", FieldEntity);
