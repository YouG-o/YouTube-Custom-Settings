/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings } from '../types/types';
import { loadExtensionSettings } from '../utils/settings';
import { localizeDocument, getMessage } from '../utils/i18n';


/**
 * This file handles the popup UI interactions and saves settings to storage
 */

// DOM Elements
const videoQualityFeature = document.getElementById('videoQualityFeature') as HTMLInputElement;
const videoQualitySelect = document.getElementById('videoQuality') as HTMLSelectElement;
const videoQualityContainer = document.getElementById('videoQualityContainer') as HTMLDivElement;
const videoQualityOptionsContainer = document.getElementById('videoQualityOptionsContainer') as HTMLDivElement;

const videoSpeedFeature = document.getElementById('videoSpeedFeature') as HTMLInputElement;
const videoSpeedSelect = document.getElementById('videoSpeed') as HTMLSelectElement;
const videoSpeedContainer = document.getElementById('videoSpeedContainer') as HTMLDivElement;

const subtitlesToggle = document.getElementById('subtitlesTranslation') as HTMLInputElement;
const subtitlesPreferenceSelect = document.getElementById('subtitlesLanguage') as HTMLSelectElement;
const subtitlesPreferenceContainer = document.getElementById('subtitlesLanguageContainer') as HTMLDivElement;

const audioNormalizerFeature = document.getElementById('audioNormalizerFeature') as HTMLInputElement;
const audioNormalizerSelect = document.getElementById('audioNormalizerValue') as HTMLSelectElement;
const audioNormalizerManual = document.getElementById('audioNormalizerManual') as HTMLInputElement;
const audioNormalizerContainer = document.getElementById('audioNormalizerContainer') as HTMLDivElement;

const volumeFeature = document.getElementById('volumeFeature') as HTMLInputElement;
const volumeValue = document.getElementById('volumeValue') as HTMLInputElement;
const volumeContainer = document.getElementById('volumeContainer') as HTMLDivElement;

const hideShortsFeature = document.getElementById('hideShortsFeature') as HTMLInputElement;
const preventShortsLoopFeature = document.getElementById('preventShortsLoopFeature') as HTMLInputElement;

// Custom settings
const audioNormalizerCustomContainer = document.getElementById('audioNormalizerCustomContainer') as HTMLDivElement;
const customThreshold = document.getElementById('customThreshold') as HTMLInputElement;
const customBoost = document.getElementById('customBoost') as HTMLInputElement;
const customRatio = document.getElementById('customRatio') as HTMLInputElement;
const customAttack = document.getElementById('customAttack') as HTMLInputElement;
const customRelease = document.getElementById('customRelease') as HTMLInputElement;
const applyShortsSpeed = document.getElementById('applyShortsSpeed') as HTMLInputElement;
const extensionVersionElement = document.getElementById('extensionVersion') as HTMLSpanElement; // Add this line

const hideMembersOnlyVideosFeature = document.getElementById('hideMembersOnlyVideosFeature') as HTMLInputElement;

const audioTrackFeature = document.getElementById('audioTrackFeature') as HTMLInputElement;
const audioTrackLanguageSelect = document.getElementById('audioTrackLanguage') as HTMLSelectElement;
const audioTrackContainer = document.getElementById('audioTrackContainer') as HTMLDivElement;

const durationRuleEnabled = document.getElementById('durationRuleEnabled') as HTMLInputElement;
const durationRuleType = document.getElementById('durationRuleType') as HTMLSelectElement;
const durationRuleMinutes = document.getElementById('durationRuleMinutes') as HTMLInputElement;

const customQualityOrderToggle = document.getElementById('customQualityOrderToggle') as HTMLInputElement;
const customQualityOrderContainer = document.getElementById('customQualityOrderContainer') as HTMLDivElement;
const qualityOrderList = document.getElementById('qualityOrderList') as HTMLUListElement;

const videoQualityClassicContainer = document.getElementById('videoQualityContainer') as HTMLDivElement;
const addQualityBtn = document.getElementById('addQualityBtn') as HTMLButtonElement;

// List of all possible qualities
const ALL_QUALITIES = [
    { value: 'highres', label: '4320p (8K)' },
    { value: 'hd2160', label: '2160p (4K)' },
    { value: 'hd1440', label: '1440p (2K)' },
    { value: 'hd1080', label: '1080p (FHD)' },
    { value: 'hd720', label: '720p (HD)' },
    { value: 'large', label: '480p' },
    { value: 'medium', label: '360p' },
    { value: 'small', label: '240p' },
    { value: 'tiny', label: '144p' }
];

// Render the custom quality order list
function renderQualityOrderList(order: string[]) {
    qualityOrderList.innerHTML = '';
    order.forEach((quality, idx) => {
        const item = document.createElement('li');
        item.className = 'bg-gray-700 rounded px-3 py-2 flex items-center justify-between';
        
        // Create span for quality label
        const qualityLabel = document.createElement('span');
        qualityLabel.textContent = ALL_QUALITIES.find(q => q.value === quality)?.label || quality;
        
        // Create buttons container
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'flex items-center gap-1';
        
        // Create move up button
        const moveUpBtn = document.createElement('button');
        moveUpBtn.type = 'button';
        moveUpBtn.className = 'move-up-btn text-gray-400 hover:text-blue-400 px-1';
        moveUpBtn.dataset.idx = String(idx);
        moveUpBtn.title = getMessage('titleMoveUp');
        moveUpBtn.textContent = '↑';
        moveUpBtn.disabled = idx === 0;
        
        // Create move down button
        const moveDownBtn = document.createElement('button');
        moveDownBtn.type = 'button';
        moveDownBtn.className = 'move-down-btn text-gray-400 hover:text-blue-400 px-1';
        moveDownBtn.dataset.idx = String(idx);
        moveDownBtn.title = getMessage('titleMoveDown');
        moveDownBtn.textContent = '↓';
        moveDownBtn.disabled = idx === order.length - 1;
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-quality-btn text-red-400 hover:text-red-600 px-1';
        removeBtn.dataset.idx = String(idx);
        removeBtn.title = getMessage('titleRemove');
        removeBtn.textContent = '×';
        
        // Assemble the structure
        buttonsDiv.appendChild(moveUpBtn);
        buttonsDiv.appendChild(moveDownBtn);
        buttonsDiv.appendChild(removeBtn);
        
        item.appendChild(qualityLabel);
        item.appendChild(buttonsDiv);
        
        qualityOrderList.appendChild(item);
    });

    // Add event listeners for move up/down and remove
    qualityOrderList.querySelectorAll('.move-up-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = Number((e.currentTarget as HTMLElement).dataset.idx);
            if (idx > 0) {
                const order = getCurrentOrder();
                [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
                renderQualityOrderList(order);
                saveSettings();
            }
        });
    });
    qualityOrderList.querySelectorAll('.move-down-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = Number((e.currentTarget as HTMLElement).dataset.idx);
            const order = getCurrentOrder();
            if (idx < order.length - 1) {
                [order[idx + 1], order[idx]] = [order[idx], order[idx + 1]];
                renderQualityOrderList(order);
                saveSettings();
            }
        });
    });
    qualityOrderList.querySelectorAll('.remove-quality-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = Number((e.currentTarget as HTMLElement).dataset.idx);
            const order = getCurrentOrder();
            order.splice(idx, 1);
            renderQualityOrderList(order);
            saveSettings();
        });
    });
}

// Add quality button logic (shows a select menu)
addQualityBtn.addEventListener('click', () => {
    const currentOrder = getCurrentOrder();
    const available = ALL_QUALITIES.filter(q => !currentOrder.includes(q.value));
    if (available.length === 0) return;

    // Create a select menu dynamically
    const select = document.createElement('select');
    select.className = 'bg-gray-800 text-white rounded px-2 py-1 border border-gray-600';
    available.forEach(q => {
        const option = document.createElement('option');
        option.value = q.value;
        option.textContent = q.label;
        select.appendChild(option);
    });

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = getMessage('buttonAdd');
    confirmBtn.className = 'ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = getMessage('buttonCancel');
    cancelBtn.className = 'ml-2 px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-400';

    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center mt-2';
    wrapper.appendChild(select);
    wrapper.appendChild(confirmBtn);
    wrapper.appendChild(cancelBtn);

    addQualityBtn.parentElement?.insertBefore(wrapper, addQualityBtn);

    confirmBtn.onclick = () => {
        currentOrder.push(select.value);
        renderQualityOrderList(currentOrder);
        saveSettings();
        wrapper.remove();
    };
    cancelBtn.onclick = () => wrapper.remove();
});

// Toggle logic: show/hide classic select and custom UI
customQualityOrderToggle.addEventListener('change', () => {
    const enabled = customQualityOrderToggle.checked;
    customQualityOrderContainer.style.display = enabled ? 'block' : 'none';
    videoQualityClassicContainer.style.display = enabled ? 'none' : 'block';
    saveSettings();
});

// Drag and drop logic (identique à avant)
let dragStartIdx: number | null = null;
qualityOrderList.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLLIElement;
    dragStartIdx = Number(target.dataset.idx);
});
qualityOrderList.addEventListener('dragover', (e) => {
    e.preventDefault();
});
qualityOrderList.addEventListener('drop', (e) => {
    e.preventDefault();
    const target = e.target as HTMLLIElement;
    const dropIdx = Number(target.closest('li')?.dataset.idx);
    if (dragStartIdx !== null && dropIdx !== undefined && dragStartIdx !== dropIdx) {
        const order = getCurrentOrder();
        const [moved] = order.splice(dragStartIdx, 1);
        order.splice(dropIdx, 0, moved);
        renderQualityOrderList(order);
        saveSettings();
    }
    dragStartIdx = null;
});
function getCurrentOrder(): string[] {
    return Array.from(qualityOrderList.children).map(li => {
        const text = (li as HTMLLIElement).querySelector('span')?.textContent;
        // Find value from label
        const found = ALL_QUALITIES.find(q => q.label === text);
        return found ? found.value : '';
    }).filter(Boolean);
}

// Function to display the extension version
function displayExtensionVersion() {
    if (extensionVersionElement) {
        const manifest = browser.runtime.getManifest();
        extensionVersionElement.textContent = manifest.version;
    }
}

// Load saved settings from storage
async function loadSettings() {
    try {
        const settings = await loadExtensionSettings();
        
        // Apply saved settings to UI
        videoQualityFeature.checked = settings.videoQuality.enabled;
        toggleContainer(videoQualityOptionsContainer, videoQualityFeature.checked);

        customQualityOrderToggle.checked = settings.videoQuality.customOrder?.enabled ?? false;
        customQualityOrderContainer.style.display = customQualityOrderToggle.checked ? 'block' : 'none';
        videoQualityContainer.style.display = customQualityOrderToggle.checked ? 'none' : 'block';

        if (!customQualityOrderToggle.checked) {
            videoQualitySelect.value = settings.videoQuality.value ?? 'auto';
        }

        const initialOrder = settings.videoQuality.customOrder?.order ?? [];
        renderQualityOrderList(initialOrder);
        
        videoSpeedFeature.checked = settings.videoSpeed.enabled;
        videoSpeedSelect.value = String(settings.videoSpeed.value);
        toggleContainer(videoSpeedContainer, videoSpeedFeature.checked);
        applyShortsSpeed.checked = settings.videoSpeed.applyToShorts !== false;
        
        subtitlesToggle.checked = settings.subtitlesPreference.enabled;
        subtitlesPreferenceSelect.value = settings.subtitlesPreference.value;
        toggleContainer(subtitlesPreferenceContainer, subtitlesToggle.checked);
        
        // Audio normalizer settings
        if (settings.audioNormalizer) {
            audioNormalizerFeature.checked = settings.audioNormalizer.enabled;
            // Set dropdown value directly from loaded settings
            audioNormalizerSelect.value = settings.audioNormalizer.value; 
            audioNormalizerManual.checked = settings.audioNormalizer.manualActivation || false;
            
            // Toggle visibility based on the loaded state
            toggleContainer(audioNormalizerContainer, audioNormalizerFeature.checked);
            // Show custom container ONLY if the loaded value is 'custom'
            toggleContainer(audioNormalizerCustomContainer, audioNormalizerSelect.value === 'custom'); 
            
            // Load custom input values if the mode is 'custom' AND custom settings exist
            if (audioNormalizerSelect.value === 'custom' && settings.audioNormalizer.customSettings) {
                customThreshold.value = settings.audioNormalizer.customSettings.threshold.toString();
                customBoost.value = settings.audioNormalizer.customSettings.boost.toString();
                customRatio.value = settings.audioNormalizer.customSettings.ratio.toString();
                customAttack.value = settings.audioNormalizer.customSettings.attack.toString();
                customRelease.value = settings.audioNormalizer.customSettings.release.toString();
            }
        }

        // Volume settings
        if (settings.volume) {
            volumeFeature.checked = settings.volume.enabled;
            volumeValue.value = String(settings.volume.value);
            toggleContainer(volumeContainer, volumeFeature.checked);
        }

        // Hide Members Only Videos setting
        if (settings.hideMembersOnlyVideos) {
            hideMembersOnlyVideosFeature.checked = settings.hideMembersOnlyVideos.enabled;
        }

        // Audio track settings
        if (settings.audioTrack) {
            audioTrackFeature.checked = settings.audioTrack.enabled;
            audioTrackLanguageSelect.value = settings.audioTrack.language;
            toggleContainer(audioTrackContainer, audioTrackFeature.checked);
        }

        // Hide Shorts setting
        if (settings.hideShorts) {
            hideShortsFeature.checked = settings.hideShorts.enabled;
        }

        // Prevent Shorts Loop setting
        if (settings.preventShortsLoop) {
            preventShortsLoopFeature.checked = settings.preventShortsLoop.enabled;
        }

        // Duration rule settings
        durationRuleEnabled.checked = settings.videoSpeed.durationRuleEnabled ?? false;
        durationRuleType.value = settings.videoSpeed.durationRuleType ?? 'less';
        durationRuleMinutes.value = String(settings.videoSpeed.durationRuleMinutes ?? 5);
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// Save settings to storage
async function saveSettings() {
    const settings: ExtensionSettings = {
        videoQuality: {
            enabled: videoQualityFeature.checked,
            value: customQualityOrderToggle.checked ? 'auto' : videoQualitySelect.value,
            customOrder: {
                enabled: customQualityOrderToggle.checked,
                order: getCurrentOrder()
            }
        },
        videoSpeed: {
            enabled: videoSpeedFeature.checked,
            value: parseFloat(videoSpeedSelect.value),
            applyToShorts: applyShortsSpeed.checked,
            durationRuleEnabled: durationRuleEnabled.checked,
            durationRuleType: durationRuleType.value as 'greater' | 'less',
            durationRuleMinutes: parseInt(durationRuleMinutes.value, 10)
        },
        subtitlesPreference: {
            enabled: subtitlesToggle.checked,
            value: subtitlesPreferenceSelect.value
        },
        audioNormalizer: {
            enabled: audioNormalizerFeature.checked,
            value: audioNormalizerSelect.value,
            manualActivation: audioNormalizerManual.checked,
            // Add custom settings if using custom intensity
            customSettings: audioNormalizerSelect.value === 'custom' ? {
                threshold: parseFloat(customThreshold.value),
                boost: parseFloat(customBoost.value),
                ratio: parseFloat(customRatio.value),
                attack: parseFloat(customAttack.value),
                release: parseFloat(customRelease.value)
            } : undefined
        },
        volume: {
            enabled: volumeFeature.checked,
            value: parseFloat(volumeValue.value)
        },
        hideMembersOnlyVideos: {
            enabled: hideMembersOnlyVideosFeature.checked
        },
        audioTrack: {
            enabled: audioTrackFeature.checked,
            language: audioTrackLanguageSelect.value
        },
        hideShorts: {
            enabled: hideShortsFeature.checked
        },
        preventShortsLoop: {
            enabled: preventShortsLoopFeature.checked
        }
    };
    
    try {
        await browser.storage.local.set({ settings });
        updateActiveTabs(settings);
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

// Toggle visibility of container based on checkbox state
function toggleContainer(container: HTMLElement, isVisible: boolean) {
    container.style.display = isVisible ? 'block' : 'none';
}

// Update all active YouTube tabs with new settings
async function updateActiveTabs(settings: ExtensionSettings) {
    const tabs = await browser.tabs.query({ url: '*://*.youtube.com/*' });
    
    for (const tab of tabs) {
        if (tab.id) {
            // Only send the audioNormalizer message if enabled and custom
            if (
                settings.audioNormalizer.enabled &&
                settings.audioNormalizer.value === 'custom' &&
                settings.audioNormalizer.customSettings
            ) {
                await browser.tabs.sendMessage(tab.id, {
                    feature: 'audioNormalizer',
                    enabled: settings.audioNormalizer.enabled,
                    value: settings.audioNormalizer.value,
                    manualActivation: settings.audioNormalizer.manualActivation,
                    customSettings: settings.audioNormalizer.customSettings
                });
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Always send the global settings update
            browser.tabs.sendMessage(tab.id, {
                action: 'updateSettings',
                settings: settings
            }).catch(error => {
                console.error(`Failed to update tab ${tab.id}:`, error);
            });
        }
    }
}

// Initialize event listeners
function initEventListeners() {
    // Feature toggles
    videoQualityFeature.addEventListener('change', () => {
        toggleContainer(videoQualityOptionsContainer, videoQualityFeature.checked);
        saveSettings();
    });
    
    videoSpeedFeature.addEventListener('change', () => {
        toggleContainer(videoSpeedContainer, videoSpeedFeature.checked);
        saveSettings();
    });
    
    subtitlesToggle.addEventListener('change', () => {
        toggleContainer(subtitlesPreferenceContainer, subtitlesToggle.checked);
        saveSettings();
    });
    
    audioNormalizerFeature.addEventListener('change', () => {
        toggleContainer(audioNormalizerContainer, audioNormalizerFeature.checked);
        saveSettings();
    });
    
    volumeFeature.addEventListener('change', () => {
        toggleContainer(volumeContainer, volumeFeature.checked);
        saveSettings();
    });

    audioTrackFeature.addEventListener('change', () => {
        toggleContainer(audioTrackContainer, audioTrackFeature.checked);
        saveSettings();
    });

    hideShortsFeature.addEventListener('change', saveSettings);
    preventShortsLoopFeature.addEventListener('change', saveSettings);

    durationRuleEnabled.addEventListener('change', saveSettings);
    durationRuleType.addEventListener('change', saveSettings);
    durationRuleMinutes.addEventListener('change', saveSettings);

    // Value changes
    videoQualitySelect.addEventListener('change', saveSettings);
    videoSpeedSelect.addEventListener('change', saveSettings);
    subtitlesPreferenceSelect.addEventListener('change', saveSettings);
    audioNormalizerSelect.addEventListener('change', saveSettings);
    volumeValue.addEventListener('change', saveSettings);
    audioTrackLanguageSelect.addEventListener('change', saveSettings);

    // Fix for the Apply to Shorts toggle - Add click handler to the parent div
    const applyShortsSpeedParent = applyShortsSpeed.parentElement;
    if (applyShortsSpeedParent) {
        applyShortsSpeedParent.addEventListener('click', (e) => {
            // Toggle the checkbox state
            applyShortsSpeed.checked = !applyShortsSpeed.checked;
            // Trigger a change event to run event handlers
            applyShortsSpeed.dispatchEvent(new Event('change'));
        });
    }
    
    // Add listener for the checkbox itself as well
    applyShortsSpeed.addEventListener('change', saveSettings);
    
    // Manual activation toggle
    audioNormalizerManual.addEventListener('change', saveSettings);
    
    // Fix for the Audio Normalizer Manual toggle - Add click handler to the parent div
    const audioNormalizerManualParent = audioNormalizerManual.parentElement;
    if (audioNormalizerManualParent) {
        audioNormalizerManualParent.addEventListener('click', (e) => {
            // Toggle the checkbox state
            audioNormalizerManual.checked = !audioNormalizerManual.checked;
            // Trigger a change event to run event handlers
            audioNormalizerManual.dispatchEvent(new Event('change'));
        });
    }
    
    // Show/hide custom settings when intensity changes
    audioNormalizerSelect.addEventListener('change', () => {
        toggleContainer(audioNormalizerCustomContainer, audioNormalizerSelect.value === 'custom');
        saveSettings();
    });
    
    // Add change listeners for all custom settings
    customThreshold.addEventListener('change', saveSettings);
    customBoost.addEventListener('change', saveSettings);
    customRatio.addEventListener('change', saveSettings);
    customAttack.addEventListener('change', saveSettings);
    customRelease.addEventListener('change', saveSettings);

    // Hide Members Only Videos feature
    hideMembersOnlyVideosFeature.addEventListener('change', saveSettings);

    // Custom quality order
    customQualityOrderToggle.addEventListener('change', () => {
        customQualityOrderContainer.style.display = customQualityOrderToggle.checked ? 'block' : 'none';
        videoQualityContainer.style.display = customQualityOrderToggle.checked ? 'none' : 'block';
        saveSettings();
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    localizeDocument();
    displayExtensionVersion();
    loadSettings();
    initEventListeners();
});

