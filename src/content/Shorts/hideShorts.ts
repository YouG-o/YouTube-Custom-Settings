/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { shortsLog, shortsErrorLog } from '../../utils/logger';
import { isHomePage, isSubscriptionsPage, isSearchPage } from '../../utils/navigation';

/**
 * Hide Shorts section from the home page feed and subscriptions page
 * Target: ytd-rich-section-renderer containing ytd-rich-shelf-renderer[is-shorts]
 */
function hideHomeFeedAndSubscriptionsShorts(): void {
    try {
        const shortsContainers = document.querySelectorAll('ytd-rich-section-renderer');
        
        shortsContainers.forEach(container => {
            // Check if this section contains Shorts (has ytd-rich-shelf-renderer with is-shorts attribute)
            const shortsShelf = container.querySelector('ytd-rich-shelf-renderer[is-shorts]');
            
            if (shortsShelf) {
                (container as HTMLElement).style.display = 'none';
                shortsLog('Hidden Shorts section from home feed and subscriptions');
            }
        });
    } catch (error) {
        shortsErrorLog('Error hiding home feed and subscriptions Shorts:', error);
    }
}

/**
 * Hide Shorts items from search page shelves
 * Target: grid-shelf-view-model elements that contain shorts lockups or links to /shorts/
 */
function hideSearchPageShorts(): void {
    try {
        // Select the specific shelf elements commonly used in search results
        const shelves = document.querySelectorAll('grid-shelf-view-model');

        shelves.forEach(shelf => {
            // Detect typical Shorts markers inside the shelf
            const hasShortsLockup = shelf.querySelector('ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, .shortsLockupViewModelHost');
            const hasShortsLink = shelf.querySelector('a[href*="/shorts/"]');

            if (hasShortsLockup || hasShortsLink) {
                (shelf as HTMLElement).style.display = 'none';
                shortsLog('Hidden Shorts shelf from search page');
            }
        });
    } catch (error) {
        shortsErrorLog('Error hiding search page Shorts:', error);
    }
}

/**
 * Hide individual Shorts from search results
 * Target: ytd-video-renderer containing links to /shorts/ or SHORTS badge
 */
function hideIndividualSearchShorts(): void {
    try {
        const videoRenderers = document.querySelectorAll('ytd-video-renderer');

        videoRenderers.forEach(renderer => {
            // Check for /shorts/ link
            const shortsLink = renderer.querySelector('a[href*="/shorts/"]');
            
            // Check for SHORTS badge
            const shortsBadge = renderer.querySelector('ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]');
            const shortsBadgeText = renderer.querySelector('.yt-badge-shape__text');
            const hasShortsBadgeText = shortsBadgeText && shortsBadgeText.textContent?.includes('SHORTS');

            if (shortsLink || shortsBadge || hasShortsBadgeText) {
                (renderer as HTMLElement).style.display = 'none';
                shortsLog('Hidden individual Short from search results');
            }
        });
    } catch (error) {
        shortsErrorLog('Error hiding individual search Shorts:', error);
    }
}

/**
 * Main function to hide Shorts from YouTube home page, subscriptions and search page
 */
function hideShorts(): void {
    if (isHomePage() || isSubscriptionsPage()) {
        //shortsLog('Hiding Shorts from home feed and subscriptions');
        hideHomeFeedAndSubscriptionsShorts();
    }

    if (isSearchPage()) {
        //shortsLog('Hiding Shorts from search page');
        hideSearchPageShorts();
    
        //shortsLog('Hiding individual Shorts from search results');
        hideIndividualSearchShorts();
    }

    

}


export { hideShorts };