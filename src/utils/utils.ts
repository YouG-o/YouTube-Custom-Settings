/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { currentSettings } from "../content/index"
import { handleVideoQuality } from "../content/videoquality/VideoQuality";
import { handleVideoSpeed } from "../content/videospeed/VideoSpeed";
import { handleSubtitlesPreference } from "../content/subtitles/SubtitlesPreference";
import { handleAudioNormalizer } from "../content/audionormalizer/AudioNormalizer";
import { handleVolume } from "../content/volume/Volume";
import { handleAudioTrack } from "../content/audioTrack/AudioTrack";
import { handleDisableNumberShortcuts } from "../content/disableNumberShortcuts/DisableNumberShortcuts";


export function applyVideoPlayerSettings(): void {
    currentSettings?.videoQuality.enabled && handleVideoQuality();
    currentSettings?.videoSpeed.enabled && handleVideoSpeed();
    currentSettings?.subtitlesPreference.enabled && handleSubtitlesPreference();
    currentSettings?.audioNormalizer.enabled && handleAudioNormalizer();
    currentSettings?.volume.enabled && handleVolume();
    currentSettings?.audioTrack.enabled && handleAudioTrack();
    handleDisableNumberShortcuts();
}