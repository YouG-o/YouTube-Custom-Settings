/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings } from "../../types/types";
import { subtitlesLog, coreLog } from "../../utils/logger";


async function syncSubtitlesLanguagePreference(): Promise<boolean> {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings as ExtensionSettings;

        if (!settings?.subtitlesPreference?.enabled) {
            return false;
        }

        // Read current YCS_SETTINGS object
        const raw = localStorage.getItem('YCS_SETTINGS');
        const ycsSettings = raw ? JSON.parse(raw) : {};

        // Update only subtitlesPreference property
        ycsSettings.subtitlesPreference = settings.subtitlesPreference;

        // Write back
        localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));

        return true;
    } catch (error) {
        subtitlesLog('Error syncing subtitle language preference:', error);
        return false;
    }
}

// Call this function during initialization
export async function handleSubtitlesPreference() {
    const isEnabled = await syncSubtitlesLanguagePreference();
    if (!isEnabled) {
        subtitlesLog('Subtitles feature is disabled, not injecting script');
        return;
    }

    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/SubtitlesScript.js');
    document.documentElement.appendChild(script);
}

// Function to handle subtitle language selection
browser.runtime.onMessage.addListener((message: unknown) => {
    coreLog('Received message:', message); // Add debug log

    if (typeof message === 'object' && message !== null &&
        'feature' in message && message.feature === 'subtitlesPreference' &&
        'language' in message && typeof message.language === 'string') {

        // Read current YCS_SETTINGS object
        const raw = localStorage.getItem('YCS_SETTINGS');
        const ycsSettings = raw ? JSON.parse(raw) : {};

        // Ensure subtitlesPreference object exists
        if (!ycsSettings.subtitlesPreference) {
            ycsSettings.subtitlesPreference = {};
        }

        // Update language
        subtitlesLog(`Setting subtitle language preference to: ${message.language}`);
        ycsSettings.subtitlesPreference.value = message.language;

        // Write back
        localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));

        // Reapply subtitles if a video is currently playing
        handleSubtitlesPreference();
    }
    return true;
});