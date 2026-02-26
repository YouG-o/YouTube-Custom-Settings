/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { playerLog } from '../../utils/logger';
import { currentSettings } from '../index';

// Flag to track if the event listener is active
let isEventListenerActive = false;

/**
 * Keyboard event handler to block number shortcuts.
 * @param e - The keyboard event.
 */
function keydownHandler(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;

    // Do not interfere when typing in input fields
    if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
    ) {
        return;
    }

    // Block number keys (0-9) and numpad keys (0-9)
    if ((e.code >= 'Digit0' && e.code <= 'Digit9') || (e.code >= 'Numpad0' && e.code <= 'Numpad9')) {
        e.stopImmediatePropagation();
        playerLog('Blocked a number key shortcut.');
    }
}

/**
 * Adds or removes the keydown event listener based on user settings.
 */
export function handleDisableNumberShortcuts(): void {
    const shouldBeActive = currentSettings?.disableNumberShortcuts?.enabled ?? false;

    if (shouldBeActive && !isEventListenerActive) {
        window.addEventListener('keydown', keydownHandler, true);
        isEventListenerActive = true;
        playerLog('Number key shortcuts blocker has been activated.');
    } else if (!shouldBeActive && isEventListenerActive) {
        window.removeEventListener('keydown', keydownHandler, true);
        isEventListenerActive = false;
        playerLog('Number key shortcuts blocker has been deactivated.');
    }
}