import * as Blockly from 'blockly';
import { haClient } from '../../services/haClient';

class EntityFieldWidget extends Blockly.FieldTextInput {
    private entities: { id: string; state: any }[] = [];
    private dropdownDiv: HTMLDivElement | null = null;

    constructor(value: string, validator?: Blockly.FieldTextInput['validator_']) {
        super(value, validator);
        this.dropdownDiv = null;
        this.loadEntities();
    }

    private async loadEntities() {
        try {
            const states = await haClient.getAllStates();
            this.entities = Object.entries(states).map(([id, state]) => ({ id, state }));
        } catch (error) {
            console.error('Failed to load entities:', error);
        }
    }

    showEditor_() {
        super.showEditor_();
        this.createDropdown();
    }

    private createDropdown() {
        if (this.dropdownDiv) {
            return;
        }

        const div = document.createElement('div');
        div.className = 'blockly-entity-dropdown';
        div.style.cssText = `
            position: absolute;
            background: white;
            border: 1px solid #ccc;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        const input = this.htmlInput_ as HTMLInputElement;
        const inputRect = input.getBoundingClientRect();
        div.style.left = inputRect.left + 'px';
        div.style.top = (inputRect.bottom + 2) + 'px';
        div.style.width = inputRect.width + 'px';

        this.dropdownDiv = div;
        this.updateDropdownContent(input.value);
        document.body.appendChild(div);

        input.addEventListener('input', () => {
            this.updateDropdownContent(input.value);
        });

        // Close dropdown when clicking outside
        const closeDropdown = (e: MouseEvent) => {
            if (!this.dropdownDiv?.contains(e.target as Node) &&
                e.target !== input) {
                this.dropdownDiv?.remove();
                this.dropdownDiv = null;
                document.removeEventListener('click', closeDropdown);
            }
        };
        document.addEventListener('click', closeDropdown);
    }

    private updateDropdownContent(searchText: string) {
        const div = this.dropdownDiv;
        if (!div) return;

        const filteredEntities = this.entities.filter(entity =>
            entity.id.toLowerCase().includes(searchText.toLowerCase())
        );

        div.innerHTML = '';
        filteredEntities.slice(0, 10).forEach(entity => {
            const item = document.createElement('div');
            item.className = 'blockly-entity-item';
            item.style.cssText = `
                padding: 8px;
                cursor: pointer;
                &:hover {
                    background: #f0f0f0;
                }
            `;
            item.textContent = entity.id;
            item.addEventListener('click', () => {
                if (this.htmlInput_) {
                    (this.htmlInput_ as HTMLInputElement).value = entity.id;
                    this.setValue(entity.id);
                    div.remove();
                    this.dropdownDiv = null;
                }
            });
            div.appendChild(item);
        });
    }

    dispose() {
        if (this.dropdownDiv) {
            this.dropdownDiv.remove();
        }
        super.dispose();
    }
}

export function registerEntityField() {
    Blockly.fieldRegistry.register('field_entity', EntityFieldWidget);
}
