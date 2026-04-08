/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
*/

/**
 * NOTE ON SCRIPT INJECTION:
 * We use script injection to access YouTube's player API directly from the page context.
 * This is necessary because the player API is not accessible from the content script context.
 * As you can see below, the injected code only uses YouTube's official player API methods.
 */


/**
 * Handles YouTube's subtitles selection to force original language
 * 
 * YouTube provides different types of subtitle tracks:
 * - ASR (Automatic Speech Recognition) tracks: Always in original video language
 * - Manual tracks: Can be original or translated
 * - Translated tracks: Generated from manual tracks
 * 
 * Strategy:
 * 1. Find ASR track to determine original video language
 * 2. Look for manual track in same language
 * 3. Apply original language track if found
 */


(() => {
    const LOG_PREFIX = '[YCS]';
    const LOG_CONTEXT = '[SUBTITLES]';
    const LOG_COLOR = '#FF9800';  // Orange
    const ERROR_COLOR = '#F44336';  // Red

    // Simplified logger functions
    function log(message, ...args) {
        console.log(
            `%c${LOG_PREFIX}${LOG_CONTEXT} ${message}`,
            `color: ${LOG_COLOR}`,
            ...args
        );
    }

    function errorLog(message, ...args) {
        console.log(
            `%c${LOG_PREFIX}${LOG_CONTEXT} %c${message}`,
            `color: ${LOG_COLOR}`,  // Keep context color for prefix
            `color: ${ERROR_COLOR}`,  // Red color for error message
            ...args
        );
    }

    // Retry counter for setPreferredSubtitles internal logic
    let preferredSubtitlesRetryCount = 0; 
    const SET_PREFERRED_SUBTITLES_MAX_RETRIES = 5; 

    // Retry counter for finding the player element
    let playerPollRetryCount = 0;
    const MAX_PLAYER_POLL_RETRIES = 25; // Approx 5 seconds (25 * 200ms)

    // Flag to ensure the main settings application logic is initiated only once per script execution instance
    let settingsAttemptOrchestrationInitiated = false;

    /**
     * Orchestrates the player readiness checks before applying subtitle settings.
     * Waits for the player API to be ready and the player to be in an active state.
     */
    function orchestratePlayerReadiness() {
        // Try to get the specified player
        let targetId = 'movie_player'; // player for regular videos
        if (window.location.pathname.startsWith('/shorts')) {
            targetId = 'shorts-player'; // player for shorts
        } else if (window.location.pathname.startsWith('/@')) {
            targetId = 'c4-player'; // player for channels main video
        } 
        const player = document.getElementById(targetId);

        // Poll for the player element if not found immediately or its essential API methods are not ready
        if (!player || typeof player.getPlayerState !== 'function' || typeof player.addEventListener !== 'function') {
            playerPollRetryCount++;
            if (playerPollRetryCount <= MAX_PLAYER_POLL_RETRIES) {
                // log(`Player element or base API not ready, retrying poll (${playerPollRetryCount}/${MAX_PLAYER_POLL_RETRIES})`);
                setTimeout(orchestratePlayerReadiness, 200);
            } else {
                errorLog('Player element or base API not found after multiple retries. Cannot configure subtitles.');
            }
            return;
        }
        
        playerPollRetryCount = 0; // Reset poll counter for any future distinct script executions

        // If this specific script instance has already started the API/state waiting process, don't restart it.
        if (settingsAttemptOrchestrationInitiated) {
            // log('Subtitle settings orchestration already initiated by this script instance.');
            return;
        }

        /**
         * Called once the Player API is confirmed ready and the player is in an active state.
         * This function then calls setPreferredSubtitles.
         */
        const onPlayerReadyAndActive = () => {
            // Double check the flag to ensure this final step is only done once per instance.
            if (!settingsAttemptOrchestrationInitiated) {
                settingsAttemptOrchestrationInitiated = true; // Mark that we are now initiating the actual settings application.
                //log('Player API ready and player active. Initiating setPreferredSubtitles.');
                preferredSubtitlesRetryCount = 0; // Reset retry count for a fresh series of attempts by setPreferredSubtitles.
                setPreferredSubtitles(); // Call the function that contains the core logic.
            }
        };
        
        /**
         * Called once the Player API is confirmed ready.
         * It then checks if the player is in an active state or waits for it.
         */
        const proceedWhenPlayerActive = () => {
            const currentPlayerState = player.getPlayerState();
            // Player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
            const isActiveState = currentPlayerState === 1 || // YT.PlayerState.PLAYING
                                  currentPlayerState === 3 || // YT.PlayerState.BUFFERING
                                  (currentPlayerState === 2 && player.getCurrentTime() > 0.1); // YT.PlayerState.PAUSED but has played

            if (isActiveState) {
                // log(`Player API ready, and player is already in an active state (${currentPlayerState}).`);
                onPlayerReadyAndActive();
            } else {
                // log(`Player API ready, but player not in active state (${currentPlayerState}). Waiting for onStateChange.`);
                let stateChangeHandlerAttached = false;
                let stateChangeFallbackTimeoutId = null;

                const stateChangeHandler = (event) => {
                    const newState = event.data; // New player state
                    if (newState === 1 || newState === 3) { // YT.PlayerState.PLAYING or YT.PlayerState.BUFFERING
                        if (stateChangeFallbackTimeoutId) clearTimeout(stateChangeFallbackTimeoutId);
                        player.removeEventListener('onStateChange', stateChangeHandler);
                        stateChangeHandlerAttached = false;
                        onPlayerReadyAndActive();
                    }
                };

                player.addEventListener('onStateChange', stateChangeHandler);
                stateChangeHandlerAttached = true;

                // Fallback timeout if onStateChange doesn't lead to an active state quickly.
                stateChangeFallbackTimeoutId = setTimeout(() => {
                    if (stateChangeHandlerAttached) { // Check if listener is still active
                        // log('Timeout waiting for player to reach an active state via onStateChange. Attempting anyway.');
                        player.removeEventListener('onStateChange', stateChangeHandler);
                        onPlayerReadyAndActive(); // Attempt to apply settings anyway.
                    }
                }, 7000); // 7 seconds fallback.
            }
        };

        // Main orchestration logic starts here: wait for onApiChange first.
        let apiChangeListenerAttached = false;
        const apiChangeHandler = () => {
            // log('onApiChange event fired. Player API should be fully ready.');
            if (apiChangeFallbackTimeoutId) clearTimeout(apiChangeFallbackTimeoutId);
            player.removeEventListener('onApiChange', apiChangeHandler);
            apiChangeListenerAttached = false;
            proceedWhenPlayerActive(); // Now that API is ready, check player state.
        };
        
        player.addEventListener('onApiChange', apiChangeHandler);
        apiChangeListenerAttached = true;

        // Fallback if onApiChange doesn't fire (e.g., if API was already fully loaded before listener was attached).
        const apiChangeFallbackTimeoutId = setTimeout(() => {
            if (apiChangeListenerAttached) { // If listener is still there, onApiChange hasn't fired.
                // log('onApiChange event did not fire within timeout. Assuming API is ready/loaded and proceeding.');
                player.removeEventListener('onApiChange', apiChangeHandler);
                apiChangeListenerAttached = false;
                if (!settingsAttemptOrchestrationInitiated) {
                    proceedWhenPlayerActive();
                }
            }
        }, 3000); // 3 seconds for onApiChange to fire.
    }

    // ...existing code... // This comment indicates that your existing setPreferredSubtitles function starts below
    function setPreferredSubtitles() {
        // Try to get the specified player
        let targetId = 'movie_player';
        if (window.location.pathname.startsWith('/shorts')) {
            targetId = 'shorts-player';
        } else if (window.location.pathname.startsWith('/@')) {
            targetId = 'c4-player'; // player for channels main video
        } 
        const player = document.getElementById(targetId);
        if (!player) return false;

        // Read from YCS_SETTINGS
        const raw = localStorage.getItem('YCS_SETTINGS');
        const ycsSettings = raw ? JSON.parse(raw) : {};
        const subtitlesLanguage = ycsSettings.subtitlesPreference?.value || 'original';
        //log(`Using preferred language: ${subtitlesLanguage}`);

        // Check if subtitles are disabled
        if (subtitlesLanguage === 'disabled') {
            log('Subtitles are disabled, disabling subtitles');
            player.setOption('captions', 'track', {});
            return true;
        }

        try {
            // Get video response to access caption tracks
            const response = player.getPlayerResponse();
            const captionTracks = response.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (!captionTracks) return false;

            // If preference is "original", look for original language
            if (subtitlesLanguage === 'original') {
                // Find ASR track to determine original video language
                const asrTrack = captionTracks.find(track => track.kind === 'asr');
                if (!asrTrack) {
                    // Fallback: if there's only one subtitle track, assume it's the original
                    if (captionTracks.length === 1) {
                        const singleTrack = captionTracks[0];
                        log(`Only subtitle track found is manual, assuming it's original: "${singleTrack.name.simpleText}" [${singleTrack.languageCode}]`);
                        player.setOption('captions', 'track', singleTrack);
                        return true;
                    }

                    log('Cannot determine original language, disabling subtitles');
                    player.setOption('captions', 'track', {});
                    return true;
                }

                // Find manual track in original language
                const originalTrack = captionTracks.find(track => 
                    track.languageCode === asrTrack.languageCode && !track.kind
                );

                // If no manual track in original language exists
                if (!originalTrack) {
                    log('No manual track in original language, disabling subtitles');
                    player.setOption('captions', 'track', {});
                    return true;
                }

                log(`Setting subtitles to original language: "${originalTrack.name.simpleText}"`);
                player.setOption('captions', 'track', originalTrack);
                return true;
            } 
            
            // For specific language preference, search for matching track
            const languageTrack = captionTracks.find(track => 
                track.languageCode === subtitlesLanguage && !track.kind
            );
            
            if (languageTrack) {
                log(`Setting subtitles to selected language: "${languageTrack.name.simpleText}"`);
                player.setOption('captions', 'track', languageTrack);
                return true;
            } else {
                log(`Selected language "${subtitlesLanguage}" not available, disabling subtitles`);
                player.setOption('captions', 'track', {});
                return true;
            }
        } catch (error) {
            //errorLog(`${error.name}: ${error.message}`);
            // Implement fallback mechanism with progressive delay
            if (preferredSubtitlesRetryCount < SET_PREFERRED_SUBTITLES_MAX_RETRIES) { 
                preferredSubtitlesRetryCount++; 
                const delay = 50 * preferredSubtitlesRetryCount; 
                //log(`Retrying in ${delay}ms (attempt ${preferredSubtitlesRetryCount}/${SET_PREFERRED_SUBTITLES_MAX_RETRIES})...`);
                
                setTimeout(() => {
                    setPreferredSubtitles();
                }, delay);
            } else {
                //errorLog(`Failed after ${SET_PREFERRED_SUBTITLES_MAX_RETRIES} retries`);
                preferredSubtitlesRetryCount = 0; 
            }
            
            return false;
        }
    }

    // Execute the orchestration logic when the script is injected
    orchestratePlayerReadiness();
})();