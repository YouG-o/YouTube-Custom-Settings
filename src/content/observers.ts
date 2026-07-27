/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { coreLog } from "../utils/logger";
import { currentSettings } from "./index";
import { applyVideoPlayerSettings, applySubtitlesPreference } from "../utils/utils";
import { hideMembersOnlyVideos } from "./memberVideos/MemberVideos";
import { waitForElement } from "../utils/dom";
import { hideShorts } from "./Shorts/hideShorts";
import { handleShortsLoopPrevention, cleanupLoopPrevention } from "./Shorts/preventShortsLoop";


let hasInitialPlayerLoadTriggered = false;
let hasInitialSettingsApplied = false;

// Flag to track if a change was initiated by the user
let userInitiatedChange = false;
// Timeout ID for resetting the user initiated flag
let userChangeTimeout: number | null = null;
let processedVideoSources: WeakMap<HTMLVideoElement, string> | null = null;

const allVideoEvents = ['loadstart', 'loadedmetadata', 'canplay', 'playing', 'play', 'timeupdate', 'seeked'];

let shouldApplySubtitlesPreference = false;
let audioTrackListener: ((e: Event) => void) | null = null;
let settingsListener: ((e: Event) => void) | null = null;
let ytPlayerUpdatedHandler: (() => void) | null = null;

export function setupVideoPlayerListener() {
    cleanUpVideoPlayerListener();
    coreLog('Setting up video player listener');

    processedVideoSources = new WeakMap();

    // Helper to set the user initiated flag with timeout
    const setUserInitiatedFlag = () => {
        userInitiatedChange = true;
        if (userChangeTimeout) window.clearTimeout(userChangeTimeout);
        userChangeTimeout = window.setTimeout(() => {
            userInitiatedChange = false;
            userChangeTimeout = null;
        }, 2000);
    };

    // Detect mouse interactions with seeking elements
    document.addEventListener('mousedown', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.ytp-settings-menu') || 
            target.closest('.ytp-progress-bar') || 
            target.closest('.ytp-chapters-container')) {
            setUserInitiatedFlag();
        }
    }, true);

    // Detect keyboard shortcuts for seeking (J, L, Arrows, Numbers 0-9, etc.)
    document.addEventListener('keydown', (e) => {
        const seekKeys = ['j', 'l', 'arrowleft', 'arrowright', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        if (seekKeys.includes(e.key.toLowerCase())) {
            setUserInitiatedFlag();
        }
    }, true);

    document.addEventListener('yt-navigate-finish', () => {
    document.querySelectorAll('video').forEach(v => {
        (v as any).srcValue = '';
        });
        coreLog('yt-navigate-finish: reset srcValue');
    });

    // --- Listener 1: Audio track application and event optimization ---
    audioTrackListener = function(e: Event) {
        if (!(e.target instanceof HTMLVideoElement)) return;
        const video = e.target as HTMLVideoElement;
        const currentSource = video.currentSrc || video.src || '';

        if (!currentSource) return;
        if ((video as any).srcValue === currentSource) return;

        if (userInitiatedChange) {
            coreLog('User initiated quality change - skipping');
            return;
        }

        (video as any).srcValue = currentSource;
        coreLog(`Video source changed. Event: ${e.type}`);

        applyVideoPlayerSettings();
        shouldApplySubtitlesPreference = true;

        if (!hasInitialPlayerLoadTriggered) {
            hasInitialPlayerLoadTriggered = true;
            coreLog('Optimized: switching to essential events for SPA navigation');
            allVideoEvents.forEach(evt => {
                if (audioTrackListener) document.removeEventListener(evt, audioTrackListener, true);
            });
            document.addEventListener('loadstart', audioTrackListener!, true);
            document.addEventListener('loadedmetadata', audioTrackListener!, true);
        }
    };

    // --- Listener 2 (initial load): apply settings after YouTube finalizes its player ---
    ytPlayerUpdatedHandler = () => {
        if (!shouldApplySubtitlesPreference) return;
        document.removeEventListener('yt-player-updated', ytPlayerUpdatedHandler!);
        ytPlayerUpdatedHandler = null;
        hasInitialSettingsApplied = true;
        coreLog('Applying post-playing settings (subtitles, embed title)');
        applySubtitlesPreference();
        shouldApplySubtitlesPreference = false;
    };
    document.addEventListener('yt-player-updated', ytPlayerUpdatedHandler);

    // --- Listener 3 (SPA & Resilience): apply settings on canplaythrough or seeked ---
    settingsListener = function(e: Event) {
        if (!(e.target instanceof HTMLVideoElement)) return;

        // Skip if a user interaction is currently active (prevents overriding manual changes)
        if (userInitiatedChange) return;

        // Apply if it's the designated application moment (shouldApply...)
        // OR if it's a seeked event (likely an auto-skip from SponsorBlock or similar tools)
        const isResilienceEvent = e.type === 'seeked';
        if (!shouldApplySubtitlesPreference && !isResilienceEvent) return;
        
        // Wait until the first load is handled by yt-player-updated, unless it's a resilience event
        if (!hasInitialSettingsApplied && !isResilienceEvent) return;

        coreLog(`Applying post-playing settings (subtitles, embed title). Event: ${e.type}`);
        applySubtitlesPreference();
        shouldApplySubtitlesPreference = false;
    };

    allVideoEvents.forEach(evt => {
        document.addEventListener(evt, audioTrackListener!, true);
    });

    document.addEventListener('canplaythrough', settingsListener, true);
    document.addEventListener('seeked', settingsListener, true);
}

function cleanUpVideoPlayerListener() {
    if (audioTrackListener) {
        allVideoEvents.forEach(evt => document.removeEventListener(evt, audioTrackListener!, true));
        document.removeEventListener('loadstart', audioTrackListener, true);
        document.removeEventListener('loadedmetadata', audioTrackListener, true);
        audioTrackListener = null;
    }
    if (settingsListener) {
        document.removeEventListener('canplaythrough', settingsListener, true);
        document.removeEventListener('seeked', settingsListener, true);
        settingsListener = null;
    }
    if (ytPlayerUpdatedHandler) {
        document.removeEventListener('yt-player-updated', ytPlayerUpdatedHandler);
        ytPlayerUpdatedHandler = null;
    }
    if (userChangeTimeout) {
        window.clearTimeout(userChangeTimeout);
        userChangeTimeout = null;
    }

    processedVideoSources = null;
    hasInitialPlayerLoadTriggered = false;
    hasInitialSettingsApplied = false;
    userInitiatedChange = false;
}




let pageGridObservers: MutationObserver[] = [];
let pageGridParentObserver: MutationObserver | null = null;
let suggestedVideosObserver: MutationObserver | null = null;

const OBSERVERS_DEBOUNCE_MS = 100;

let pageVideosDebounceTimer: number | null = null;
let suggestedVideosDebounceTimer: number | null = null;


async function pageVideosObserver() {
    cleanupPageVideosObserver();

    let pageName: string = '';
    if (window.location.pathname === '/') {
        pageName = 'Home';
    } else if (window.location.pathname === '/feed/subscriptions') {
        pageName = 'Subscriptions';
    } else if (window.location.pathname.includes('/@')) {
        pageName = 'Channel';
    } else if (window.location.pathname === '/feed/trending') {
        pageName = 'Trending';
    } else {
        pageName = 'Unknown';
    }
    coreLog(`Setting up ${pageName} page videos observer`);

    // Wait for the rich grid renderer to be present
    const grids = Array.from(document.querySelectorAll('#contents.ytd-rich-grid-renderer')) as HTMLElement[];

    if (grids.length === 0) {
        // Wait for the first grid to appear
        await new Promise<void>(resolve => {
            const observer = new MutationObserver(() => {
                const found = document.querySelector('#contents.ytd-rich-grid-renderer');
                if (found) {
                    observer.disconnect();
                    resolve();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    const allGrids = Array.from(document.querySelectorAll('#contents.ytd-rich-grid-renderer')) as HTMLElement[];
    allGrids.forEach(grid => {
        currentSettings?.hideMembersOnlyVideos.enabled && hideMembersOnlyVideos();
        currentSettings?.hideShorts.enabled && hideShorts();
        const observer = new MutationObserver(() => handleGridMutationDebounced(pageName));
        observer.observe(grid, {
            childList: true,
            attributes: true,
            characterData: true
        });
        pageGridObservers.push(observer);
    });

    // Add parent grid observer (useful when clicking on filters)
    const gridParent = document.querySelector('#primary > ytd-rich-grid-renderer') as HTMLElement | null;
    if (gridParent) {
        pageGridParentObserver = new MutationObserver(() => handleGridMutationDebounced(pageName));
        pageGridParentObserver.observe(gridParent, {
            attributes: true
        });
    }
}

// New debounced handler for grid mutations
function handleGridMutationDebounced(pageName: string) {
    if (pageVideosDebounceTimer !== null) {
        clearTimeout(pageVideosDebounceTimer);
    }
    pageVideosDebounceTimer = window.setTimeout(() => {
        coreLog(`${pageName} page mutation detected.`);
        if (currentSettings?.hideMembersOnlyVideos.enabled) {
            hideMembersOnlyVideos();
            setTimeout(() => {
                hideMembersOnlyVideos();
            }, 650);
        }
        if (currentSettings?.hideShorts.enabled) {
            hideShorts();
            setTimeout(() => {
                hideShorts();
            }, 650);
        }
        pageVideosDebounceTimer = null;
    }, OBSERVERS_DEBOUNCE_MS);
}

function suggestedVidsObserver() {
    cleanupSuggestedVideosObserver();

    // Observer for recommended videos (side bar)
    waitForElement('#secondary-inner ytd-watch-next-secondary-results-renderer #items').then((contents) => {
        coreLog('Setting up recommended videos observer');
        
        currentSettings?.hideMembersOnlyVideos.enabled && hideMembersOnlyVideos();
        
        // Check if we need to observe deeper (when logged in)
        const itemSection = contents.querySelector('ytd-item-section-renderer');
        const targetElement = itemSection ? itemSection : contents;
        
        coreLog(`Observing: ${targetElement === contents ? '#items directly' : 'ytd-item-section-renderer inside #items'}`);
        
        suggestedVideosObserver = new MutationObserver(() => {
            if (suggestedVideosDebounceTimer !== null) {
                clearTimeout(suggestedVideosDebounceTimer);
            }
            suggestedVideosDebounceTimer = window.setTimeout(() => {
                coreLog('Recommended videos mutation debounced (side bar)');
                currentSettings?.hideMembersOnlyVideos.enabled && hideMembersOnlyVideos();
                suggestedVideosDebounceTimer = null;
            }, OBSERVERS_DEBOUNCE_MS);
        });
        
        suggestedVideosObserver.observe(targetElement, {
            childList: true,
            subtree: true
        });
    });
};

function cleanupPageVideosObserver() {
    pageGridObservers.forEach(observer => observer.disconnect());
    pageGridObservers = [];
    pageGridParentObserver?.disconnect();
    pageGridParentObserver = null;

    if (pageVideosDebounceTimer !== null) {
        clearTimeout(pageVideosDebounceTimer);
        pageVideosDebounceTimer = null;
    }
}

function cleanupSuggestedVideosObserver() {
    suggestedVideosObserver?.disconnect();
    suggestedVideosObserver = null;

    if (suggestedVideosDebounceTimer !== null) {
        clearTimeout(suggestedVideosDebounceTimer);
        suggestedVideosDebounceTimer = null;
    }
}

function observersCleanup() {
    coreLog('Cleaning up all observers');
    
    cleanupPageVideosObserver();
    cleanupSuggestedVideosObserver();
    cleanupSearchResultsVideosObserver();
    cleanupLoopPrevention();
}

let searchObserver: MutationObserver | null = null;
let searchDebounceTimer: number | null = null;

function searchResultsObserver() {
    cleanupSearchResultsVideosObserver();

    // --- Observer for search results
    waitForElement('ytd-section-list-renderer #contents').then((contents) => {
        let pageName = null;
        if (window.location.pathname === '/results') {
            pageName = 'Search';
        } else if (window.location.pathname === '/feed/history') {
            pageName = 'History';
        } else if (window.location.pathname === '/feed/subscriptions') {
            pageName = 'Subscriptions';
        } else {
            pageName = 'Unknown';
        }
      
        coreLog(`Setting up ${pageName} results videos observer`);

        currentSettings?.hideShorts.enabled && hideShorts();
        
        searchObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && 
                    mutation.addedNodes.length > 0 && 
                    mutation.target instanceof HTMLElement) {
                    const titles = mutation.target.querySelectorAll('#video-title');
                    if (titles.length > 0) {
                        if (searchDebounceTimer !== null) {
                            clearTimeout(searchDebounceTimer);
                        }
                        searchDebounceTimer = window.setTimeout(() => {
                            coreLog(`${pageName} page mutation debounced`);
                            currentSettings?.hideShorts.enabled && hideShorts();
                            searchDebounceTimer = null;
                        }, OBSERVERS_DEBOUNCE_MS);
                        break;
                    }
                }
            }
        });

        searchObserver.observe(contents, {
            childList: true,
            subtree: true
        });
    });
};

function cleanupSearchResultsVideosObserver() {
    searchObserver?.disconnect();
    searchObserver = null;

    if (searchDebounceTimer !== null) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
    }
}

// URL OBSERVER -----------------------------------------------------------
let urlChangeDebounceTimer: number | null = null;
const URL_CHANGE_DEBOUNCE_MS = 250;

export function setupUrlObserver() {
    coreLog('Setting up URL observer');    
    // --- Standard History API monitoring
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        coreLog('pushState called with:', args);
        originalPushState.apply(this, args);
        handleUrlChange();
    };
    
    history.replaceState = function(...args) {
        coreLog('replaceState called with:', args);
        originalReplaceState.apply(this, args);
        handleUrlChange();
    };
    
    // --- Browser navigation (back/forward)
    window.addEventListener('popstate', () => {
        coreLog('popstate event triggered');
        handleUrlChange();
    });
    
    // --- YouTube's custom page data update event
    window.addEventListener('yt-page-data-updated', () => {
        coreLog('YouTube page data updated');
        handleUrlChange();
    });
    
    // --- YouTube's custom SPA navigation events
    /*
    window.addEventListener('yt-navigate-start', () => {
        coreLog('YouTube SPA navigation started');
        handleUrlChange();
        });
        */
       
       /*
       window.addEventListener('yt-navigate-finish', () => {
        coreLog('YouTube SPA navigation completed');
        handleUrlChange();
    */

    // --- Ensure observers are initialized on full page load (not just SPA navigation)
    handleUrlChange();
}


function handleUrlChange() {
        // Clear existing debounce timer
    if (urlChangeDebounceTimer !== null) {
        clearTimeout(urlChangeDebounceTimer);
    }

    // Set new debounce timer
    urlChangeDebounceTimer = window.setTimeout(() => {
        handleUrlChangeInternal();
        urlChangeDebounceTimer = null;
    }, URL_CHANGE_DEBOUNCE_MS);
}

function handleUrlChangeInternal() {
    //coreLog(`[URL] Current pathname:`, window.location.pathname);
    coreLog(`[URL] Full URL:`, window.location.href);

    // --- Clean up existing observers
    observersCleanup();
    
    // --- Check for Shorts page
    if (window.location.pathname.startsWith('/shorts/')) {
        coreLog(`[URL] Detected Shorts page`);
        if (currentSettings?.preventShortsLoop?.enabled) {
            handleShortsLoopPrevention();
        }
        return;
    }
    
    // --- Check if URL contains patterns
    const isChannelPage = window.location.pathname.includes('/@');
    if (isChannelPage) {
        // --- Handle all new channel page types (videos, featured, shorts, etc.)
        coreLog(`[URL] Detected channel page`);
        if (currentSettings?.hideMembersOnlyVideos.enabled || currentSettings?.hideShorts.enabled) {
            pageVideosObserver();
        }
        return;
    }
    
    switch(window.location.pathname) {
        case '/results': // --- Search page
        coreLog(`[URL] Detected search page`);
            if (currentSettings?.hideMembersOnlyVideos.enabled || currentSettings?.hideShorts.enabled) {
                searchResultsObserver()
            }
        break;
        case '/': // --- Home page
            coreLog(`[URL] Detected home page`);
            if (currentSettings?.hideMembersOnlyVideos.enabled || currentSettings?.hideShorts.enabled) {
                pageVideosObserver();
            }
            break;        
        case '/feed/subscriptions': // --- Subscriptions page
            coreLog(`[URL] Detected subscriptions page`);
            if (currentSettings?.hideMembersOnlyVideos.enabled || currentSettings?.hideShorts.enabled) {
                pageVideosObserver();
            }
            break;
        case '/feed/trending':  // --- Trending page
            coreLog(`[URL] Detected trending page`);
            if (currentSettings?.hideMembersOnlyVideos.enabled || currentSettings?.hideShorts.enabled) {
                pageVideosObserver();
            }
            break;
        case '/feed/history':  // --- History page
            coreLog(`[URL] Detected history page`);
            break;
        case '/playlist':  // --- Playlist page
            coreLog(`[URL] Detected playlist page`);
            break;
        case '/watch': // --- Video page
            coreLog(`[URL] Detected video page`);
            currentSettings?.hideMembersOnlyVideos.enabled && suggestedVidsObserver();
            break;
        case '/embed': // --- Embed video page
            coreLog(`[URL] Detected embed video page`);
            break;
    }
}


// --- Visibility change listener to refresh titles when tab becomes visible
let visibilityChangeListener: ((event: Event) => void) | null = null;

export function setupVisibilityChangeListener(): void {
    // Clean up existing listener first
    cleanupVisibilityChangeListener();
    
    coreLog('Setting up visibility change listener');
    
    visibilityChangeListener = () => {
        // Only execute when tab becomes visible again
        if (document.visibilityState === 'visible') {
            coreLog('Tab became visible, refreshing titles to fix potential duplicates');
            currentSettings?.hideMembersOnlyVideos.enabled && hideMembersOnlyVideos();
            currentSettings?.hideShorts.enabled && hideShorts();
        }
    };
    
    // Add the event listener
    document.addEventListener('visibilitychange', visibilityChangeListener);
}

function cleanupVisibilityChangeListener(): void {
    if (visibilityChangeListener) {
        document.removeEventListener('visibilitychange', visibilityChangeListener);
        visibilityChangeListener = null;
    }
}