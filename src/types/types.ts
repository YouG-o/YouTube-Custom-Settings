/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

export interface ToggleSetting {
    enabled: boolean;
}

export interface FeatureSetting<T> extends ToggleSetting {
    value: T;
    customOrder?: CustomOrderSetting;
}

export interface VolumeSetting extends ToggleSetting {
    value: number;
}

export interface AudioTrackSetting extends ToggleSetting {
    language: string;
}

export interface SubtitlesPreferenceSetting extends FeatureSetting<string> {
    asr: boolean;
}

export interface CustomOrderSetting extends ToggleSetting {
    order: string[];
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
    subtitlesPreference: SubtitlesPreferenceSetting;
    audioNormalizer: AudioNormalizerSetting;
    volume: VolumeSetting;
    hideMembersOnlyVideos: ToggleSetting;
    audioTrack: AudioTrackSetting;
    hideShorts: ToggleSetting;
    preventShortsLoop: ToggleSetting;
    disableNumberShortcuts: ToggleSetting;
    enableLogs: ToggleSetting;
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
