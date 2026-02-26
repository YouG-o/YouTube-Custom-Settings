/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings } from "../types/types";

// Default settings as a constant
export const DEFAULT_SETTINGS: ExtensionSettings = {
    videoQuality: {
        enabled: false,
        value: 'hd2160',
        customOrder: {
            enabled: false,
            order: []
        }
    },
    videoSpeed: {
        enabled: false,
        value: 1,
        applyToShorts: true,
        durationRuleEnabled: false,
        durationRuleType: 'less',
        durationRuleMinutes: 5
    },
    subtitlesPreference: {
        enabled: false,
        value: 'original'
    },
    audioNormalizer: {
        enabled: false,
        value: 'custom',
        manualActivation: true,
        customSettings: {
            threshold: -30,
            boost: 1.2,
            ratio: 4,
            attack: 0.01,
            release: 0.25
        }
    },
    volume: {
        enabled: false,
        value: 50
    },
    hideMembersOnlyVideos: {
        enabled: false
    },
    audioTrack: {
        enabled: false,
        language: 'original',
    },
    hideShorts: {
        enabled: false
    },
    preventShortsLoop: {
        enabled: false
    },
    disableNumberShortcuts: {
        enabled: false
    }
};

// Define the type for installation details
export interface InstalledDetails {
    reason: 'install' | 'update' | 'browser_update' | 'chrome_update';
    previousVersion?: string;
    id?: string;
}