import * as Blockly from 'blockly/core';
import { haClient, HAAction } from '../services/haClient';

/**
 * Custom field for Home Assistant actions with domain grouping
 */
export class FieldAction extends Blockly.Field {
    private dropdownDiv: HTMLElement | null = null;
    private actions: Record<string, HAAction> = {};
    private selectedIndex = -1;
    private isDropdownVisible = false;
    private boundHandleDocumentClick: (e: MouseEvent) => void;
    private textElement: SVGTextElement | null = null;
    protected size_: { height: number; width: number } = { height: 0, width: 0 };

    /**
     * Class constructor for the action field.
     * @param {string=} value The initial value of the field. Should be a valid action ID (domain.action).
     * @param {Object=} config A map of options used to configure the field.
     */
    constructor(value?: string, config?: Object) {
        super(value || '');
        this.SERIALIZABLE = true;
        this.CURSOR = 'pointer';
        this.boundHandleDocumentClick = this.handleDocumentClick.bind(this);
        // Connect to HA and load actions
        haClient.connect().then(() => this.loadActions());
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
            (this.fieldGroup_ as unknown as HTMLElement).addEventListener('click', () => {
                this.showEditor_();
            });
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
            'text',
            {
                'class': 'blocklyText',
                'x': 0,
                'y': 12,
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
        const value = this.getValue();
        if (!value) return '⌄ Select action';

        const [domain, actionName] = value.split('.');
        if (!domain || !actionName) return value;

        const action = this.actions[value];
        if (!action) return value;

        return `${domain}.${actionName} (${action.name})`;
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
     * Load actions from Home Assistant
     */
    private async loadActions() {
        try {
            console.log('Loading actions...');
            this.actions = await haClient.getActions();
            console.log('Loaded actions:', {
                count: Object.keys(this.actions).length,
                actions: this.actions
            });
            if (Object.keys(this.actions).length === 0) {
                console.warn('No actions loaded - this might indicate a parsing issue');
            }
            // Re-render to show action name if available
            this.render_();
        } catch (error) {
            console.error('Failed to load actions:', error);
        }
    }

    /**
     * Show the editor for this field
     * @override
     */
    protected override showEditor_() {
        this.showDropdown_();
        document.addEventListener('click', this.boundHandleDocumentClick);

        // Handle keyboard events on document level
        const keyHandler = (e: KeyboardEvent) => {
            if (!this.isDropdownVisible) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectedIndex = Math.min(this.selectedIndex + 1, Object.keys(this.actions).length - 1);
                    this.updateSelection_();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                    this.updateSelection_();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.selectedIndex >= 0) {
                        const actionId = Object.keys(this.actions)[this.selectedIndex];
                        this.setValue(actionId);
                        this.hideDropdown_();
                    }
                    break;
                case 'Escape':
                    this.hideDropdown_();
                    break;
            }
        };

        document.addEventListener('keydown', keyHandler);
        this.dropdownDiv?.addEventListener('remove', () => {
            document.removeEventListener('keydown', keyHandler);
        });
    }

    /**
     * Update the visual selection in the dropdown
     */
    private updateSelection_() {
        if (!this.dropdownDiv) return;

        // Remove previous selection
        const items = this.dropdownDiv.querySelectorAll('div:not(.domain)');
        items.forEach(item => item.classList.remove('selected'));

        // Add new selection
        if (this.selectedIndex >= 0 && this.selectedIndex < items.length) {
            items[this.selectedIndex].classList.add('selected');
            // Scroll into view if needed
            items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Handle document clicks to close dropdown when clicking outside
     */
    private handleDocumentClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (this.dropdownDiv && !this.dropdownDiv.contains(target) && !this.fieldGroup_?.contains(target)) {
            this.hideDropdown_();
        }
    }

    /**
     * Show the dropdown with action suggestions
     */
    private showDropdown_() {
        // Create dropdown if it doesn't exist
        if (!this.dropdownDiv) {
            this.dropdownDiv = document.createElement('div');
            this.dropdownDiv.className = 'blocklyFieldActionDropdown';
            document.body.appendChild(this.dropdownDiv);

            // Add styles if they don't exist
            if (!document.getElementById('blocklyFieldActionStyles')) {
                const style = document.createElement('style');
                style.id = 'blocklyFieldActionStyles';
                style.textContent = `
                    .blocklyFieldActionDropdown {
                        position: fixed;
                        background: white;
                        border: 1px solid #ccc;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        max-height: 200px;
                        overflow-y: auto;
                        z-index: 100000;
                    }
                    .blocklyFieldActionDropdown div {
                        padding: 4px 8px;
                        cursor: pointer;
                        white-space: nowrap;
                    }
                    .blocklyFieldActionDropdown div:hover,
                    .blocklyFieldActionDropdown div.selected {
                        background: #e8f0fe;
                    }
                    .blocklyFieldActionDropdown .domain {
                        font-weight: bold;
                        color: #666;
                        padding: 4px 8px;
                        background: #f5f5f5;
                        position: sticky;
                        top: 0;
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
            dropdown.style.display = 'block';
        }

        this.updateDropdownContent_();
        this.isDropdownVisible = true;
    }

    /**
     * Hide the dropdown
     */
    private hideDropdown_() {
        if (this.dropdownDiv && this.isDropdownVisible) {
            document.removeEventListener('click', this.boundHandleDocumentClick);
            this.dropdownDiv.remove();
            this.dropdownDiv = null;
            this.isDropdownVisible = false;
            this.selectedIndex = -1;
        }
    }

    /**
     * Update dropdown content based on available actions
     */
    private updateDropdownContent_() {
        const dropdown = this.dropdownDiv;
        if (!dropdown) return;

        dropdown.innerHTML = '';

        const actionEntries = Object.entries(this.actions);
        console.log('Updating dropdown with actions:', {
            totalActions: actionEntries.length,
            actions: this.actions
        });

        if (actionEntries.length === 0) {
            const noActions = document.createElement('div');
            noActions.textContent = 'No actions available';
            noActions.style.padding = '8px';
            noActions.style.color = '#666';
            dropdown.appendChild(noActions);
            return;
        }

        // Group actions by domain
        const groupedActions = actionEntries.reduce((groups: Record<string, HAAction[]>, [actionId, action]) => {
            const domain = actionId.split('.')[0];
            if (!groups[domain]) {
                groups[domain] = [];
            }
            groups[domain].push(action);
            return groups;
        }, {});

        console.log('Grouped actions:', {
            domains: Object.keys(groupedActions),
            groups: groupedActions
        });

        Object.entries(groupedActions).forEach(([domain, actions]) => {
            // Add domain header
            const domainDiv = document.createElement('div');
            domainDiv.className = 'domain';
            domainDiv.textContent = domain;
            dropdown.appendChild(domainDiv);

            // Add actions
            actions.forEach(action => {
                const div = document.createElement('div');
                div.textContent = `${action.name} (${action.id})`;
                div.onclick = () => {
                    console.log('Selected action:', action);
                    this.setValue(action.id);
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
     * Constructs a FieldAction from a JSON arg object.
     * @param {!Object} options A JSON object with options.
     * @returns {!FieldAction} The new field instance.
     * @package
     * @nocollapse
     */
    static fromJson(options: any): FieldAction {
        return new FieldAction(options['value']);
    }

    /**
     * Validates the action ID format.
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

        // Basic action ID format validation (domain.action)
        if (!newValue.includes('.')) {
            return null;
        }

        // Split into domain and action
        const [domain, action] = newValue.split('.');

        // Validate domain exists and action is present
        if (!domain || !action) {
            return null;
        }

        // Validate no spaces in action ID
        if (newValue.includes(' ')) {
            return null;
        }

        return newValue;
    }
}

// Register the field with Blockly
Blockly.fieldRegistry.register('field_action', FieldAction);
