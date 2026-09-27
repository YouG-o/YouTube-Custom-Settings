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

    const TIMER_ID = 'ycs-adjusted-progress';
    const TIMER_ACTIVE_CLASS = 'ycs-remaining-timer-active';
    const TIMER_STYLE_ID = 'ycs-remaining-timer-style';

    function getPlayerVideo() {
        const player = document.getElementById('movie_player') || document.getElementById('shorts-player') || document.getElementById('c4-player');
        return (player && player.querySelector('video')) || document.querySelector('video');
    }

    function getTimeContentsElement(video) {
        const player = video && video.closest('.html5-video-player');
        return (player && player.querySelector('.ytp-time-contents')) || document.querySelector('.ytp-time-contents');
    }

    // Hide YouTube's own "elapsed / duration" while our timer is shown
    function ensureTimerStyle() {
        if (document.getElementById(TIMER_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = TIMER_STYLE_ID;
        style.textContent = `
            .${TIMER_ACTIVE_CLASS} .ytp-time-current,
            .${TIMER_ACTIVE_CLASS} .ytp-time-separator,
            .${TIMER_ACTIVE_CLASS} .ytp-time-duration {
                display: none !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function removeTimer() {
        document.querySelectorAll(`#${TIMER_ID}, #ycs-adjusted-duration`)
            .forEach((timer) => timer.remove());
        document.querySelectorAll(`.${TIMER_ACTIVE_CLASS}`)
            .forEach((element) => element.classList.remove(TIMER_ACTIVE_CLASS));
    }

    function createTimer(timeContents) {
        const existingTimers = Array.from(document.querySelectorAll(`#${TIMER_ID}, #ycs-adjusted-duration`));
        const timer = existingTimers.shift() || document.createElement('span');
        existingTimers.forEach((extraTimer) => extraTimer.remove());

        timer.id = TIMER_ID;

        // Put the timer where YouTube's current time is, also after YouTube re-renders it
        const currentTimeElement = timeContents.querySelector('.ytp-time-current');
        if (currentTimeElement) {
            if (timer.nextElementSibling !== currentTimeElement) {
                currentTimeElement.insertAdjacentElement('beforebegin', timer);
            }
        } else if (timer.parentElement !== timeContents) {
            timeContents.appendChild(timer);
        }
        return timer;
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
        removeTimer();
    }

    // Show the remaining time and the duration at the current playback speed
    // in place of YouTube's timer, e.g. "-13:13 / 16:16" at 2x.
    // It uses the live playback rate, so a manual speed change is shown too.
    function startAdjustedProgressDisplay(speed, attempt = 0) {
        stopAdjustedProgressDisplay();

        const video = getPlayerVideo();
        if (!video) {
            if (attempt < 10) {
                const retryTimer = setTimeout(() => startAdjustedProgressDisplay(speed, attempt + 1), 200);
                window[PROGRESS_STATE_KEY] = { retryTimer };
            }
            return;
        }

        ensureTimerStyle();

        const update = () => {
            const timeContents = getTimeContentsElement(video);
            if (!timeContents) return;

            const currentSpeed = video.playbackRate;
            const durationSeconds = getVideoDurationSeconds();

            // Show YouTube's own timer when we cannot calculate the time (e.g. live streams)
            if (!Number.isFinite(currentSpeed) || currentSpeed <= 0 ||
                !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
                removeTimer();
                return;
            }

            const elapsedSeconds = Number.isFinite(video.currentTime) ? video.currentTime : 0;
            const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
            const text = `-${formatTime(remainingSeconds / currentSpeed)} / ${formatTime(durationSeconds / currentSpeed)}`;

            const timer = createTimer(timeContents);
            if (timer.textContent !== text) {
                timer.textContent = text;
            }
            timer.title = `Remaining time at ${currentSpeed}x playback speed`;
            timeContents.classList.add(TIMER_ACTIVE_CLASS);
        };

        const events = ['timeupdate', 'durationchange', 'loadedmetadata', 'seeked', 'ratechange'];
        events.forEach((eventName) => video.addEventListener(eventName, update));
        window[PROGRESS_STATE_KEY] = { video, update, events };
        update();
    }

    // Execute immediately when script is injected
    setPlaybackSpeed();
})();
