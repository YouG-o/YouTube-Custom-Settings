/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

export interface CustomOrderSetting {
    enabled: boolean;
    order: string[];
}

export interface FeatureSetting<T> {
    enabled: boolean;
    value: T;
    customOrder?: CustomOrderSetting;
}

export interface SpeedSetting extends FeatureSetting<number> {
    applyToShorts: boolean;
    durationRuleEnabled?: boolean;
    durationRuleType?: 'greater' | 'less';
    durationRuleMinutes?: number;
}

export interface AudioNormalizerSetting extends FeatureSetting<string> {
    manualActivation: boolean;
    customSettings?: {
        threshold: number;
        boost: number;
        ratio: number;
        attack: number;
        release: number;
    };
}

export interface ExtensionSettings {
    videoQuality: FeatureSetting<string>;
    videoSpeed: SpeedSetting;
    subtitlesPreference: FeatureSetting<string>;
    audioNormalizer: AudioNormalizerSetting;
    volume: {
        enabled: boolean;
        value: number;
    };
    hideMembersOnlyVideos: {
        enabled: boolean;
    };
    audioTrack: {
        enabled: boolean;
        language: string;
    };
    hideShorts: {
        enabled: boolean;
    };
    preventShortsLoop: {
        enabled: boolean;
    };
    disableNumberShortcuts: {
        enabled: boolean;
    };
}

export interface Message {
    action: string;
    settings: ExtensionSettings;
}

/**
 * Represents a YouTube audio track object.
 */
export interface YouTubeAudioTrack {
    id: string;
    [key: string]: any; // Allow extra properties
}

/**
 * Represents a YouTube player element with audio track API.
 */
export interface YouTubePlayer extends HTMLElement {
    getAvailableAudioTracks: () => YouTubeAudioTrack[];
    getAudioTrack: () => YouTubeAudioTrack | null;
    setAudioTrack: (track: YouTubeAudioTrack) => void;
}
