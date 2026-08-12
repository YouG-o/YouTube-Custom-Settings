/**
 * NOTE ON SCRIPT INJECTION:
 * We use script injection to access YouTube's player API directly from the page context.
 * This is necessary because the player API is not accessible from the content script context.
 * The injected code only uses YouTube's official player API methods.
 */

(() => {
    const LOG_PREFIX = '[YCS]';
    const LOG_CONTEXT = '[VIDEO SPEED]';
    const LOG_COLOR = '#fca5a5';  // Light red
    const ERROR_COLOR = '#F44336';  // Red
    const PROGRESS_STATE_KEY = '__YCS_VIDEO_SPEED_PROGRESS__';

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

    // Check if current video is a live stream
    function isLiveStream() {
        try {
            // Method 1: Check player data
            let targetId = 'movie_player';
            if (window.location.pathname.startsWith('/shorts')) {
                targetId = 'shorts-player';
            } else if (window.location.pathname.startsWith('/@')) {
                targetId = 'c4-player'; // player for channels main video
            }
            const player = document.getElementById(targetId);
            
            if (player && typeof player.getVideoData === 'function') {
                const videoData = player.getVideoData();
                if (videoData && videoData.isLive) {
                    log('Live stream detected via player data');
                    return true;
                }
            }
            
            // Method 2: Check for live badge in the DOM
            const liveBadge = document.querySelector('.ytp-live-badge');
            if (liveBadge && window.getComputedStyle(liveBadge).display !== 'none') {
                log('Live stream detected via badge');
                return true;
            }
            
            // Method 3: Check URL patterns
            if (window.location.href.includes('/live/')) {
                log('Live stream detected via URL');
                return true;
            }
            
            return false;
        } catch (error) {
            errorLog(`Error checking if stream is live: ${error.message}`);
            return false;
        }
    }

    function shouldApplySpeed() {
        // Read from YCS_SETTINGS
        const raw = localStorage.getItem('YCS_SETTINGS');
        const ycsSettings = raw ? JSON.parse(raw) : {};
        const videoSpeed = ycsSettings.videoSpeed || {};
        
        const ruleEnabled = videoSpeed.durationRuleEnabled === true;
        if (!ruleEnabled) return true;
        
        const ruleType = videoSpeed.durationRuleType || 'less';
        const ruleMinutes = videoSpeed.durationRuleMinutes || 60;

        let targetId = 'movie_player';
        if (window.location.pathname.startsWith('/shorts')) {
            targetId = 'shorts-player';
        } else if (window.location.pathname.startsWith('/@')) {
            targetId = 'c4-player';
        }
        const player = document.getElementById(targetId);
        if (!player || typeof player.getDuration !== 'function') return true;
        const durationSeconds = player.getDuration();
        const durationMinutes = durationSeconds / 60;

        if (ruleType === 'greater' && durationMinutes > ruleMinutes) return false;
        if (ruleType === 'less' && durationMinutes < ruleMinutes) return false;
        return true;
    }

    function setPlaybackSpeed() {
        try {
            // Don't apply speed changes to live streams
            if (isLiveStream()) {
                log('Not changing speed for live stream');
                stopAdjustedProgressDisplay();
                return false;
            }
            
            // Read from YCS_SETTINGS
            const raw = localStorage.getItem('YCS_SETTINGS');
            const ycsSettings = raw ? JSON.parse(raw) : {};
            const videoSpeed = ycsSettings.videoSpeed || {};
            
            const speedEnabled = videoSpeed.enabled === true;
            if (!speedEnabled) {
                const video = document.querySelector('video');
                if (video) video.playbackRate = 1;
                stopAdjustedProgressDisplay();
                return false;
            }

            if (window.location.pathname.startsWith('/shorts') && videoSpeed.applyToShorts === false) {
                const video = document.querySelector('video');
                if (video) video.playbackRate = 1;
                stopAdjustedProgressDisplay();
                return false;
            }

            const preferredSpeed = videoSpeed.value || 1;
            
            // For speeds above YouTube's limit (2.0), always use direct HTML5 video element manipulation
            if (preferredSpeed > 2.0 || preferredSpeed < 0.25) {
                //log('Speed value outside YouTube API limit, using direct video element manipulation');
                // Check duration rule before applying speed
                const ruleEnabled = videoSpeed.durationRuleEnabled === true;
                if (ruleEnabled) {
                    const ruleType = videoSpeed.durationRuleType || 'greater';
                    const ruleMinutes = videoSpeed.durationRuleMinutes || 60;

                    const video = document.querySelector('video');
                    if (!video) {
                        errorLog('Video element not found');
                        return false;
                    }
                    const durationSeconds = video.duration;
                    const durationMinutes = durationSeconds / 60;
                    //log(`Video duration: ${durationMinutes} minutes (raw: ${durationSeconds} seconds)`);
                    if ((ruleType === 'greater' && durationMinutes > ruleMinutes) ||
                        (ruleType === 'less' && durationMinutes < ruleMinutes)) {
                        log('Duration rule matched, not applying speed (using x1)');
                        video.playbackRate = 1;
                        stopAdjustedProgressDisplay();
                        return true;
                    }
                    video.playbackRate = preferredSpeed;
                    log('Playback speed set to (via HTML5 video element):', preferredSpeed);
                    startAdjustedProgressDisplay(preferredSpeed);
                    return true;
                } else {
                    const video = document.querySelector('video');
                    if (!video) {
                        errorLog('Video element not found');
                        return false;
                    }
                    video.playbackRate = preferredSpeed;
                    log('Playback speed set to (via HTML5 video element):', preferredSpeed);
                    startAdjustedProgressDisplay(preferredSpeed);
                    return true;
                }
            }
            
            // For normal speeds, try to use YouTube's player API first
            let targetId = 'movie_player';
            if (window.location.pathname.startsWith('/shorts')) {
                targetId = 'shorts-player';
            }
            const player = document.getElementById(targetId);
            
            if (!player || typeof player.setPlaybackRate !== 'function') {
                const video = document.querySelector('video');
                if (!video) {
                    errorLog('Video element not found');
                    return false;
                }

                video.playbackRate = preferredSpeed;
                log('Playback speed set to (via HTML5 video element):', preferredSpeed);
                startAdjustedProgressDisplay(preferredSpeed);
                return true;
            }

            // Check duration rule before applying speed
            const ruleEnabled = videoSpeed.durationRuleEnabled === true;
            if (ruleEnabled) {
                const ruleType = videoSpeed.durationRuleType || 'greater';
                const ruleMinutes = videoSpeed.durationRuleMinutes || 60;

                if (player.getDuration) {
                    const durationSeconds = player.getDuration();
                    const durationMinutes = durationSeconds / 60;
                    //log(`Video duration: ${durationMinutes} minutes (raw: ${durationSeconds} seconds)`);
                    if ((ruleType === 'greater' && durationMinutes > ruleMinutes) ||
                        (ruleType === 'less' && durationMinutes < ruleMinutes)) {
                        log(`Duration rule matched ${durationMinutes}, not applying speed (using x1)`);
                        const video = document.querySelector('video');
                        if (video) video.playbackRate = 1;
                        stopAdjustedProgressDisplay();
                        return true;
                    }
                }
            }
            
            // Use YouTube player API to set playback rate for normal speeds
            player.setPlaybackRate(preferredSpeed);
            log('Playback speed set to (via YouTube player API):', preferredSpeed);
            startAdjustedProgressDisplay(preferredSpeed);
            return true;
        } catch (error) {
            errorLog(`Failed to set playback speed: ${error.message}`);
            return false;
        }
    }

    function formatTime(seconds) {
        const total = Math.max(0, Math.floor(seconds));
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = total % 60;

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }

    function getVideoDurationSeconds() {
        const video = document.querySelector('video');
        if (video && Number.isFinite(video.duration) && video.duration > 0) {
            return video.duration;
        }

        const player = document.getElementById('movie_player') || document.getElementById('shorts-player') || document.getElementById('c4-player');
        if (player && typeof player.getDuration === 'function') {
            const duration = player.getDuration();
            if (Number.isFinite(duration) && duration > 0) {
                return duration;
            }
        }

        return NaN;
    }

    function getDurationElement() {
        return document.querySelector('.ytp-time-duration');
    }

    function createAdjustedProgressBadge() {
        const durationElement = getDurationElement();
        if (!durationElement) return null;

        const existingBadges = Array.from(document.querySelectorAll('#ycs-adjusted-progress, #ycs-adjusted-duration'));
        const badge = existingBadges.shift() || null;

        existingBadges.forEach((extraBadge) => extraBadge.remove());

        if (badge) {
            return badge;
        }

        const newBadge = document.createElement('span');
        newBadge.id = 'ycs-adjusted-progress';
        newBadge.style.display = 'inline-block';
        newBadge.style.marginLeft = '0.25rem';
        newBadge.style.color = '#ccc';
        newBadge.style.fontSize = '0.9em';
        newBadge.style.userSelect = 'none';
        newBadge.style.pointerEvents = 'none';
        durationElement.insertAdjacentElement('afterend', newBadge);
        return newBadge;
    }

    function stopAdjustedProgressDisplay() {
        const state = window[PROGRESS_STATE_KEY];
        if (state?.video && state?.update) {
            state.events.forEach((eventName) => {
                state.video.removeEventListener(eventName, state.update);
            });
        }
        if (state?.retryTimer) {
            clearTimeout(state.retryTimer);
        }
        delete window[PROGRESS_STATE_KEY];
        document.querySelectorAll('#ycs-adjusted-progress, #ycs-adjusted-duration')
            .forEach((badge) => badge.remove());
    }

    function startAdjustedProgressDisplay(speed, attempt = 0) {
        stopAdjustedProgressDisplay();
        if (!Number.isFinite(speed) || speed === 1) return;

        const video = document.querySelector('video');
        if (!video) {
            if (attempt < 10) {
                const retryTimer = setTimeout(() => startAdjustedProgressDisplay(speed, attempt + 1), 200);
                window[PROGRESS_STATE_KEY] = { retryTimer };
            }
            return;
        }

        const update = () => {
            const badge = createAdjustedProgressBadge();
            if (!badge) return;

            const durationSeconds = getVideoDurationSeconds();
            if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
                badge.textContent = '';
                return;
            }

            const elapsedSeconds = Number.isFinite(video.currentTime) ? video.currentTime : 0;
            badge.textContent = `(${formatTime(elapsedSeconds / speed)} / ${formatTime(durationSeconds / speed)})`;
            badge.title = `Time at ${speed}x playback speed`;
        };
        const events = ['timeupdate', 'durationchange', 'loadedmetadata', 'seeked'];
        events.forEach((eventName) => video.addEventListener(eventName, update));
        window[PROGRESS_STATE_KEY] = { video, update, events };
        update();
    }

    // Execute immediately when script is injected
    setPlaybackSpeed();
})();
