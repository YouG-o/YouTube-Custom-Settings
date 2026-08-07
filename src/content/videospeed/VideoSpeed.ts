/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings } from "../../types/types";
import { videoSpeedLog, videoSpeedErrorLog } from "../../utils/logger";


async function syncVideoSpeedPreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings as ExtensionSettings;
        
        if (settings?.videoSpeed) {
            // Read current YCS_SETTINGS object
            const raw = localStorage.getItem('YCS_SETTINGS');
            const ycsSettings = raw ? JSON.parse(raw) : {};
            
            // Update only videoSpeed property
            ycsSettings.videoSpeed = settings.videoSpeed;
            
            // Write back
            localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
            
            //videoSpeedLog(`Synced video speed preference from extension storage: ${settings.videoSpeed.value}`);
        }
    } catch (error) {
        videoSpeedErrorLog('Error syncing video speed preference:', error);
    }
}

// Call this function during initialization
export async function handleVideoSpeed() {   
    await syncVideoSpeedPreference(); // Sync speed preference
    
    // Check if enabled
    const raw = localStorage.getItem('YCS_SETTINGS');
    const ycsSettings = raw ? JSON.parse(raw) : {};
    const speedEnabled = ycsSettings.videoSpeed?.enabled === true;
    
    if (!speedEnabled) {
        videoSpeedLog('Video speed feature is disabled, clearing injected state');
    }
    
    // Check if current page is a shorts page
    const isShorts = window.location.pathname.startsWith('/shorts');
    
    // Check if we should apply to shorts
    const applyToShorts = ycsSettings.videoSpeed?.applyToShorts !== false;
    
    // The injected script also handles cleanup, so do not return before it runs.
    if (isShorts && !applyToShorts) {
        videoSpeedLog('Clearing video speed for Shorts (disabled in settings)');
    }
    
    // If we get here, we need to inject the script
    //videoSpeedLog('Injecting speed script');
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/VideoSpeedScript.js');
    document.documentElement.appendChild(script);
}

// Function to handle video speed selection
browser.runtime.onMessage.addListener((message: unknown) => {
    if (typeof message === 'object' && message !== null &&
        'feature' in message && message.feature === 'videoSpeed' &&
        'speed' in message && typeof message.speed === 'number' &&
        'enabled' in message && typeof message.enabled === 'boolean') {
        
        // Read current YCS_SETTINGS object
        const raw = localStorage.getItem('YCS_SETTINGS');
        const ycsSettings = raw ? JSON.parse(raw) : {};
        
        // Ensure videoSpeed object exists
        if (!ycsSettings.videoSpeed) {
            ycsSettings.videoSpeed = {};
        }
        
        // Store preference
        videoSpeedLog(`Setting video speed preference to: ${message.speed}, enabled: ${message.enabled}`);
        ycsSettings.videoSpeed.enabled = message.enabled;
        ycsSettings.videoSpeed.value = message.speed;
        
        // Store the "apply to shorts" preference if it exists
        if ('applyToShorts' in message && typeof message.applyToShorts === 'boolean') {
            ycsSettings.videoSpeed.applyToShorts = message.applyToShorts;
        }

        if ('applyToMusicVideos' in message && typeof message.applyToMusicVideos === 'boolean') {
            ycsSettings.videoSpeed.applyToMusicVideos = message.applyToMusicVideos;
        }
        
        // Write back
        localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
        
        // Reapply speed if a video is currently playing
        handleVideoSpeed();
    }
    return true;
});
