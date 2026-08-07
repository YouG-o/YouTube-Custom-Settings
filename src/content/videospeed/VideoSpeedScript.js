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
    const MUSIC_DETECTION_MAX_ATTEMPTS = 60;
    const MUSIC_DETECTION_RETRY_MS = 250;
    const MUSIC_DETECTION_STATE_KEY = '__YCS_VIDEO_SPEED_MUSIC_DETECTION__';
    const EXPLICIT_MUSIC_VIDEO_TYPES = new Set([
        'MUSIC_VIDEO_TYPE_ATV',
        'MUSIC_VIDEO_TYPE_OFFICIAL_SOURCE_MUSIC',
        'MUSIC_VIDEO_TYPE_OMV',
        'MUSIC_VIDEO_TYPE_UGC'
    ]);
    const OFFICIAL_ARTIST_BADGE_PATH_PREFIX = 'M9.03 2.242 8.272 3H7.2A4.2';

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

    // YouTube exposes music classification in the player response. Using this
    // metadata avoids unreliable title, description, or channel-name heuristics.
    function getMusicVideoStatus() {
        try {
            const pathVideoId = window.location.pathname.startsWith('/shorts/')
                ? window.location.pathname.split('/')[2]
                : new URLSearchParams(window.location.search).get('v');
            const player = document.getElementById('movie_player') ||
                document.getElementById('shorts-player') ||
                document.getElementById('c4-player');
            const playerResponse = player && typeof player.getPlayerResponse === 'function'
                ? player.getPlayerResponse()
                : null;

            if (playerResponse?.videoDetails) {
                if (pathVideoId && playerResponse.videoDetails.videoId !== pathVideoId) {
                    return null;
                }

                const musicVideoType = playerResponse.videoDetails.musicVideoType;
                if (EXPLICIT_MUSIC_VIDEO_TYPES.has(musicVideoType)) return true;
            }

            const pageVideoId = document.querySelector('meta[itemprop="identifier"]')?.content;
            if (pathVideoId && pageVideoId && pageVideoId !== pathVideoId) return null;

            const category = playerResponse?.microformat?.playerMicroformatRenderer?.category ||
                document.querySelector('meta[itemprop="genre"]')?.content;
            if (!category) return null;
            if (typeof category !== 'string' || category.toLowerCase() !== 'music') {
                return false;
            }

            const pageAuthor = document.querySelector('[itemprop="author"] [itemprop="name"]')
                ?.getAttribute('content') || '';
            const author = playerResponse?.videoDetails?.author || pageAuthor;
            if (/\s-\sTopic$/i.test(author)) return true;

            const owner = document.querySelector('#owner ytd-video-owner-renderer, ytd-video-owner-renderer');
            if (!owner) return null;

            const ownerAuthor = owner.querySelector('#channel-name #text')?.getAttribute('title') ||
                owner.querySelector('#channel-name')?.textContent?.trim() || '';
            if (pageAuthor && ownerAuthor && pageAuthor !== ownerAuthor) return null;

            const hasOfficialArtistBadge = Array.from(owner.querySelectorAll('ytd-badge-supported-renderer')).some((badge) => {
                const badgeData = badge.data?.metadataBadgeRenderer || badge.data;
                return badgeData?.icon?.iconType === 'AUDIO_BADGE' ||
                    Array.from(badge.querySelectorAll('svg path')).some((path) =>
                        path.getAttribute('d')?.startsWith(OFFICIAL_ARTIST_BADGE_PATH_PREFIX)
                    );
            });

            // Owner renderer often appears before its badges. Treat missing badge
            // as pending on Music pages so early injection cannot misclassify an
            // official music video as a regular video.
            return hasOfficialArtistBadge ? true : null;
        } catch (error) {
            errorLog(`Error checking if video is music: ${error.message}`);
            return null;
        }
    }

    function clearMusicDetectionState(token) {
        const state = window[MUSIC_DETECTION_STATE_KEY];
        if (token && state?.token !== token) return;
        if (state?.timer) clearTimeout(state.timer);
        delete window[MUSIC_DETECTION_STATE_KEY];
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

    function setPlaybackSpeed(musicDetectionAttempt = 0, detectionToken = null) {
        try {
            if (musicDetectionAttempt === 0) {
                clearMusicDetectionState();
                detectionToken = Symbol('music-detection');
                window[MUSIC_DETECTION_STATE_KEY] = { token: detectionToken, timer: null };
            } else if (window[MUSIC_DETECTION_STATE_KEY]?.token !== detectionToken) {
                return false;
            }

            // Don't apply speed changes to live streams
            if (isLiveStream()) {
                log('Not changing speed for live stream');
                clearMusicDetectionState(detectionToken);
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
                clearMusicDetectionState(detectionToken);
                return false;
            }

            if (window.location.pathname.startsWith('/shorts') && videoSpeed.applyToShorts === false) {
                const video = document.querySelector('video');
                if (video) video.playbackRate = 1;
                clearMusicDetectionState(detectionToken);
                return false;
            }

            if (videoSpeed.applyToMusicVideos !== true) {
                const musicVideoStatus = getMusicVideoStatus();
                if (musicVideoStatus === null && musicDetectionAttempt < MUSIC_DETECTION_MAX_ATTEMPTS) {
                    const video = document.querySelector('video');
                    if (video) video.playbackRate = 1;
                    const timer = setTimeout(
                        () => setPlaybackSpeed(musicDetectionAttempt + 1, detectionToken),
                        MUSIC_DETECTION_RETRY_MS
                    );
                    window[MUSIC_DETECTION_STATE_KEY] = { token: detectionToken, timer };
                    return false;
                }
                if (musicVideoStatus === null) {
                    const video = document.querySelector('video');
                    if (video) video.playbackRate = 1;
                    log('Music classification unavailable, keeping normal speed');
                    clearMusicDetectionState(detectionToken);
                    return false;
                }
                if (musicVideoStatus === true) {
                    const video = document.querySelector('video');
                    if (video) video.playbackRate = 1;
                    log('Music video detected, using normal speed');
                    updateAdjustedDurationDisplay(1);
                    clearMusicDetectionState(detectionToken);
                    return true;
                }
            }

            clearMusicDetectionState(detectionToken);

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
                        return true;
                    }
                    video.playbackRate = preferredSpeed;
                    log('Playback speed set to (via HTML5 video element):', preferredSpeed);
                    return true;
                } else {
                    const video = document.querySelector('video');
                    if (!video) {
                        errorLog('Video element not found');
                        return false;
                    }
                    video.playbackRate = preferredSpeed;
                    log('Playback speed set to (via HTML5 video element):', preferredSpeed);
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
                updateAdjustedDurationDisplay(preferredSpeed);
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
                        return true;
                    }
                }
            }
            
            // Use YouTube player API to set playback rate for normal speeds
            player.setPlaybackRate(preferredSpeed);
            log('Playback speed set to (via YouTube player API):', preferredSpeed);
            updateAdjustedDurationDisplay(preferredSpeed);
            return true;
        } catch (error) {
            clearMusicDetectionState(detectionToken);
            errorLog(`Failed to set playback speed: ${error.message}`);
            return false;
        }
    }

    function formatTime(seconds) {
        const total = Math.max(0, Math.round(seconds));
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

    function createAdjustedDurationBadge() {
        const durationElement = getDurationElement();
        if (!durationElement) return null;

        const existingBadges = Array.from(document.querySelectorAll('#ycs-adjusted-duration'));
        const badge = existingBadges.shift() || null;

        existingBadges.forEach((extraBadge) => extraBadge.remove());

        if (badge) {
            return badge;
        }

        const newBadge = document.createElement('span');
        newBadge.id = 'ycs-adjusted-duration';
        newBadge.style.display = 'inline-block';
        newBadge.style.marginLeft = '0.25rem';
        newBadge.style.color = '#ccc';
        newBadge.style.fontSize = '0.9em';
        newBadge.style.userSelect = 'none';
        newBadge.style.pointerEvents = 'none';
        durationElement.insertAdjacentElement('afterend', newBadge);
        return newBadge;
    }

    function updateAdjustedDurationDisplay(speed, attempt = 0) {
        const badge = createAdjustedDurationBadge();
        if (!badge) {
            if (attempt < 5) {
                setTimeout(() => updateAdjustedDurationDisplay(speed, attempt + 1), 200);
            }
            return;
        }

        if (speed === 1) {
            badge.textContent = '';
            return;
        }

        const durationSeconds = getVideoDurationSeconds();
        if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
            badge.textContent = '';
            return;
        }

        const adjustedSeconds = durationSeconds / speed;
        badge.textContent = `(${formatTime(adjustedSeconds)})`;
    }

    // Execute immediately when script is injected
    setPlaybackSpeed();
})();
