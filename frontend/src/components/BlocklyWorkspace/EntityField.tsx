import * as Blockly from 'blockly';
import { haClient } from '../../services/haClient';
import './EntityField.css';

interface Entity {
    id: string;
    state: string;
    attributes: Record<string, any>;
}

class EntityFieldWidget extends Blockly.FieldTextInput {
    private entities: Entity[] = [];
    private dropdownDiv: HTMLDivElement | null = null;
    private selectedIndex: number = -1;

    constructor(value: string, validator?: Blockly.FieldTextInput['validator_']) {
        super(value, validator);
        this.dropdownDiv = null;
        this.loadEntities();
    }

    private async loadEntities() {
        try {
            const states = await haClient.getAllStates();
            this.entities = Object.entries(states).map(([id, state]) => ({
                id,
                state: state.state,
                attributes: state.attributes
            }));
        } catch (error) {
            console.error('Failed to load entities:', error);
        }
    }

    showEditor_() {
        super.showEditor_();
        this.createDropdown();
    }

    private getDomainIcon(domain: string): string {
        const icons: Record<string, string> = {
            light: '💡',
            switch: '🔌',
            sensor: '📊',
            binary_sensor: '⚡',
            climate: '🌡️',
            media_player: '🎵',
            camera: '📷',
            cover: '🚪',
            fan: '💨',
            automation: '⚙️',
            scene: '🎬',
            script: '📜',
            input_boolean: '✅',
            input_number: '🔢',
            input_text: '📝',
            timer: '⏲️',
            vacuum: '🧹',
            water_heater: '🚰',
            weather: '☁️',
            zone: '📍',
            person: '👤',
            group: '👥',
            sun: '☀️',
            default: '🔍'
        };
        return icons[domain] || icons.default;
    }

    private getEntityDetails(entity: Entity): string {
        const details: string[] = [entity.state];
        const domain = entity.id.split('.')[0];

        switch (domain) {
            case 'light':
                if (entity.attributes.brightness) {
                    details.push(`${Math.round((entity.attributes.brightness / 255) * 100)}%`);
                }
                if (entity.attributes.color_temp) {
                    details.push(`${entity.attributes.color_temp}K`);
                }
                break;

            case 'sensor':
            case 'binary_sensor':
                if (entity.attributes.unit_of_measurement) {
                    details.push(entity.attributes.unit_of_measurement);
                }
                if (entity.attributes.device_class) {
                    details.push(entity.attributes.device_class.replace('_', ' '));
                }
                break;

            case 'climate':
                if (entity.attributes.current_temperature) {
                    details.push(`${entity.attributes.current_temperature}°`);
                }
                if (entity.attributes.hvac_action) {
                    details.push(entity.attributes.hvac_action);
                }
                break;

            case 'media_player':
                if (entity.attributes.media_title) {
                    details.push(entity.attributes.media_title);
                }
                if (entity.attributes.source) {
                    details.push(entity.attributes.source);
                }
                break;

            case 'cover':
                if (entity.attributes.current_position) {
                    details.push(`${entity.attributes.current_position}%`);
                }
                break;

            case 'fan':
                if (entity.attributes.percentage) {
                    details.push(`${entity.attributes.percentage}%`);
                }
                if (entity.attributes.preset_mode) {
                    details.push(entity.attributes.preset_mode);
                }
                break;

            case 'vacuum':
                if (entity.attributes.battery_level) {
                    details.push(`${entity.attributes.battery_level}%`);
                }
                if (entity.attributes.status) {
                    details.push(entity.attributes.status);
                }
                break;

            case 'weather':
                if (entity.attributes.temperature) {
                    details.push(`${entity.attributes.temperature}°`);
                }
                if (entity.attributes.humidity) {
                    details.push(`${entity.attributes.humidity}%`);
                }
                break;

            case 'person':
                if (entity.attributes.location_name) {
                    details.push(entity.attributes.location_name);
                }
                break;

            case 'timer':
                if (entity.attributes.duration) {
                    details.push(entity.attributes.duration);
                }
                break;

            case 'sun':
                if (entity.attributes.elevation) {
                    details.push(`${Math.round(entity.attributes.elevation)}°`);
                }
                break;
        }

        return details.join(' • ');
    }

    private highlightMatches(text: string, search: string): string {
        if (!search) return text;

        const parts = text.split(new RegExp(`(${search})`, 'gi'));
        return parts.map(part =>
            part.toLowerCase() === search.toLowerCase()
                ? `<span class="highlight">${part}</span>`
                : part
        ).join('');
    }

    private createDropdown() {
        if (this.dropdownDiv) {
            return;
        }

        // Create and style the dropdown container
        const div = document.createElement('div');
        div.className = 'blockly-entity-dropdown';
        div.style.position = 'fixed'; // This needs to remain as inline style for positioning

        // Position the dropdown below the input
        const input = this.htmlInput_ as HTMLInputElement;
        const inputRect = input.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        // Adjust position to account for scroll and ensure visibility
        div.style.left = `${inputRect.left + scrollX}px`;
        div.style.top = `${inputRect.bottom + scrollY + 2}px`;

        this.dropdownDiv = div;
        this.updateDropdownContent(input.value);
        document.body.appendChild(div);

        // Add input event listener for filtering
        input.addEventListener('input', () => {
            this.selectedIndex = -1;
            this.updateDropdownContent(input.value);
        });

        // Add keyboard navigation
        input.addEventListener('keydown', (e) => {
            if (!this.dropdownDiv) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectedIndex = Math.min(
                        this.selectedIndex + 1,
                        this.dropdownDiv.querySelectorAll('.blockly-entity-item').length - 1
                    );
                    this.updateSelection();
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                    this.updateSelection();
                    break;

                case 'Enter':
                    e.preventDefault();
                    if (this.selectedIndex >= 0) {
                        const items = this.dropdownDiv.querySelectorAll('.blockly-entity-item');
                        if (items[this.selectedIndex]) {
                            (items[this.selectedIndex] as HTMLElement).click();
                        }
                    }
                    break;

                case 'Escape':
                    e.preventDefault();
                    this.dropdownDiv.remove();
                    this.dropdownDiv = null;
                    break;
            }
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

    private updateSelection() {
        if (!this.dropdownDiv) return;

        // Remove previous selection
        const items = this.dropdownDiv.querySelectorAll('.blockly-entity-item');
        items.forEach(item => item.classList.remove('selected'));

        // Add selection to current item
        if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
            items[this.selectedIndex].classList.add('selected');
            // Ensure selected item is visible
            (items[this.selectedIndex] as HTMLElement).scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }

    private updateDropdownContent(searchText: string) {
        const div = this.dropdownDiv;
        if (!div) return;

        const searchLower = searchText.toLowerCase();
        const filteredEntities = this.entities.filter(entity => {
            // Match against entity ID
            if (entity.id.toLowerCase().includes(searchLower)) {
                return true;
            }

            // Match against friendly name
            if (entity.attributes.friendly_name?.toLowerCase().includes(searchLower)) {
                return true;
            }

            // Match against device class
            if (entity.attributes.device_class?.toLowerCase().includes(searchLower)) {
                return true;
            }

            // Match against domain
            const domain = entity.id.split('.')[0];
            if (domain.includes(searchLower)) {
                return true;
            }

            return false;
        });

        div.innerHTML = '';

        // Show loading state if entities haven't been loaded yet
        if (this.entities.length === 0) {
            const loading = document.createElement('div');
            loading.className = 'blockly-entity-no-results';
            loading.textContent = 'Loading entities...';
            div.appendChild(loading);
            return;
        }

        // Show no results message if no matches found
        if (filteredEntities.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'blockly-entity-no-results';
            noResults.textContent = 'No matching entities found';
            div.appendChild(noResults);
            return;
        }

        filteredEntities.slice(0, 10).forEach(entity => {
            const item = document.createElement('div');
            item.className = 'blockly-entity-item';

            // Add domain icon
            const domain = entity.id.split('.')[0];
            const icon = document.createElement('span');
            icon.className = 'icon';
            icon.textContent = this.getDomainIcon(domain);
            item.appendChild(icon);

            // Add entity info container
            const info = document.createElement('div');
            info.className = 'entity-info';
            info.style.flex = '1';

            // Add entity name/ID with highlighted matches
            const entityId = document.createElement('div');
            entityId.className = 'text';

            const displayText = entity.attributes.friendly_name || entity.id;
            entityId.innerHTML = this.highlightMatches(displayText, searchLower);

            // Add entity ID as title for hover tooltip
            entityId.title = entity.id;

            // If using friendly name, add entity ID in details
            if (entity.attributes.friendly_name) {
                const idSpan = document.createElement('span');
                idSpan.className = 'entity-id';
                idSpan.innerHTML = this.highlightMatches(entity.id, searchLower);
                info.appendChild(idSpan);
            }

            info.appendChild(entityId);

            // Add entity state and relevant attributes
            const details = document.createElement('div');
            details.className = 'entity-details';
            details.textContent = this.getEntityDetails(entity);
            info.appendChild(details);

            item.appendChild(info);

            // Add click and hover handlers
            item.addEventListener('click', () => {
                if (this.htmlInput_) {
                    (this.htmlInput_ as HTMLInputElement).value = entity.id;
                    this.setValue(entity.id);
                    div.remove();
                    this.dropdownDiv = null;
                }
            });

            // Update selection on hover
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = Array.from(div.querySelectorAll('.blockly-entity-item')).indexOf(item);
                this.updateSelection();
            });

            div.appendChild(item);
        });

        // Add a count if there are more entities
        if (filteredEntities.length > 10) {
            const more = document.createElement('div');
            more.className = 'blockly-entity-more';
            more.textContent = `${filteredEntities.length - 10} more entities...`;
            div.appendChild(more);
        }
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
