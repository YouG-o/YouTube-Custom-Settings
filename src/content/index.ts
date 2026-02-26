/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { coreLog, coreErrorLog } from '../utils/logger';
import { loadExtensionSettings } from '../utils/settings';
import { ExtensionSettings, Message } from '../types/types';
import { handleVideoSpeed } from './videospeed/VideoSpeed';
import { handleVideoQuality } from './videoquality/VideoQuality';
import { handleSubtitlesPreference } from './subtitles/SubtitlesPreference';
import { handleAudioNormalizer } from './audionormalizer/AudioNormalizer';
import { setupVideoPlayerListener } from './observers';
import { handleVolume } from './volume/Volume';
import { setupUrlObserver, setupVisibilityChangeListener } from './observers';
import { injectFetchInterceptor, hideMembersOnlyVideos } from './memberVideos/MemberVideos';
import { handleAudioTrack } from './audioTrack/AudioTrack';
import { hideShorts } from './Shorts/hideShorts';

coreLog('Content script starting to load...');

export let currentSettings: ExtensionSettings | null = null;

// Initialize features based on settings
async function initializeFeatures() {
    currentSettings = await loadExtensionSettings();

    // Apply settings
    applyStoredSettings();

    initializeVideoPlayerListener();

    if(currentSettings.hideMembersOnlyVideos.enabled){
        injectFetchInterceptor();
    }

    if(currentSettings.hideShorts.enabled || currentSettings.hideMembersOnlyVideos.enabled || currentSettings.preventShortsLoop?.enabled){
        setupUrlObserver();
        setupVisibilityChangeListener();
    }
}

// Initialize functions
let videoPlayerListenerInitialized = false;

function initializeVideoPlayerListener() {
    if (!videoPlayerListenerInitialized && (
        currentSettings?.videoQuality.enabled || 
        currentSettings?.videoSpeed.enabled || 
        currentSettings?.subtitlesPreference.enabled ||
        currentSettings?.audioNormalizer.enabled ||
        currentSettings?.volume?.enabled ||
        currentSettings?.audioTrack?.enabled ||
        currentSettings?.disableNumberShortcuts?.enabled
    )) {
        setupVideoPlayerListener();
        videoPlayerListenerInitialized = true;
    }
}

// Apply settings by sending them to the injected script
function applyStoredSettings() {
    if (!currentSettings) return;
    
    window.postMessage({
        type: 'YCS_SETTINGS_UPDATE',
        settings: currentSettings
    }, '*');
    
    // Apply settings immediately to current video if it's playing
    if (currentSettings.videoQuality.enabled) {
        handleVideoQuality();
    }
    
    if (currentSettings.videoSpeed.enabled) {
        handleVideoSpeed();
    }
    
    if (currentSettings.subtitlesPreference.enabled) {
        handleSubtitlesPreference();
    }
    
    if (currentSettings.audioNormalizer.enabled) {
        handleAudioNormalizer();
    }

    if (currentSettings?.volume.enabled) {
        handleVolume();
    }

    if (currentSettings?.hideMembersOnlyVideos.enabled) {
        hideMembersOnlyVideos();
    }

    if (currentSettings.audioTrack.enabled) {
        handleAudioTrack();
    }

    if (currentSettings.hideShorts.enabled) {
        hideShorts();
    }
}

// Message handler for settings updates
browser.runtime.onMessage.addListener((message: unknown) => {
    if (isSettingsMessage(message)) {
        // Update stored settings
        currentSettings = message.settings;
        
        // Apply new settings
        applyStoredSettings();
        return true;
    }
    return true;
});

// Type guard for settings messages
function isSettingsMessage(message: any): message is Message {
    return message && 
    message.action === 'updateSettings' && 
    typeof message.settings === 'object';
}

initializeFeatures().then(() => {
    coreLog('Content script loaded successfully.');
}).catch((error) => {
    coreErrorLog('Error loading content script:', error);
});