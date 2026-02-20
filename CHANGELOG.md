# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


### Fixed
- Improved detection of "Members Only" videos in the "related videos" section: now only hides `.yt-badge-shape--commerce` badges if they contain a `.yt-badge-shape__icon`, which is present on members-only badges but not on fundraiser/commerce badges. This avoids hiding fundraiser videos while still hiding members-only content in related lists.

## [1.12.1] - 2026-01-08

### Fix
- Hide parent ytd-rich-item-renderer on the homepage to prevent empty grid slots when members-only videos are hidden.

### Feat
- Added support of external embed yt player

## [1.12.0] - 2025-11-26

### Added
- i18n locales support
- Added French & Ukrainian translations of the add-on (thanks to [btncua](https://github.com/btncua) for Ukrainian translation)

## [1.11.1] - 2025-11-24

### Fix
- Add support for new "Members only" badge selector

### Feat
- Ukrainian language option for subtitles and audio track selection


## [1.11.0] - 2025-11-03

### Feat
- Added prevent shorts loop feature

## [1.10.0] - 2025-10-27

### Feat
- Hide shorts (from Homepage, Subscriptions and search results page)

## [1.9.3] - 2025-10-20
- New icon


## [1.9.2] - 2025-10-16 
> **Note:** Version 1.9.1 was skipped due to a mistake

### Fix
- Fixed missing observer initialization after full page reload by manually calling `handleUrlChange()` in `setupUrlObserver`. This ensures all observers and features are correctly set up whether the user navigates via SPA or refreshes the browser.

## [1.9.0] - 2025-10-07

### Feature
- Added 8K to quality setting

### Refactor
- Renamed Extension to YouTube Custom Settings (updated everything related)
- Unified all localStorage settings into a single `YCS_SETTINGS` object for better maintainability and consistency

## [1.8.2] - 2025-09-22

### Feature
- Member videos hiding : Added suggested videos support. (DOM only for now)


## [1.8.0] - 2025-07-30

### Feature
- Added a "Custom Quality Order" feature: you can now define a personalized priority list for video qualities. If enabled, the extension will always try to apply the first available quality from your custom list, instead of just the preferred quality.

### Changed
- Removed automatic reload of YouTube tabs on extension install. Instead, a clear warning is now displayed on the Welcome page, with a button allowing users to manually reload active YouTube tabs. Hibernating or backgroud tabs are ignored.


## [1.7.0] - 2025-07-25

### Feature
- Added a "duration rule" feature for video speed: you can now specify a rule so that videos longer or shorter than a chosen duration will always play at normal speed (x1), ignoring your custom speed setting.


## [1.6.0] - 2025-07-24

### Feature
- Audio Track feature : choose your default audio track (original or specified language)

## [1.5.0] - 2025-07-18

### Changed
- Now applies the closest available video quality if the preferred quality is unavailable.

### Added
- Add request interception method to filter members-only videos before DOM rendering.

## [1.4.0] - 2025-07-12

### Feat
- New feature : Hide members only videos

## [1.3.0] - 2025-07-10

### Feat
- Add a Default Volume feature

### Changed
- Refactored the entire codebase to use explicit ES module imports/exports in all files.

### Refactor
- Centralize settings loading logic using loadExtensionSettings in popup and content scripts

## [1.2.20] - 2025-06-16

### Changed
- Improved subtitle language preference storage by using a consistent, prefixed key (`yds-subtitlesLanguage`) in localStorage to prevent conflicts and ensure reliability.
- Standardized video player listener system with multi-event detection and automatic optimization for better performance and consistency across extensions.

## [1.2.12] - 2025-06-11

### Added
- Changelog documentation
- Issue templates for GitHub
- Automated release workflow for Chrome and Firefox builds

### Fixed
- Pop tooltip display issues
- Subtitles not applying correctly on direct video loads (e.g. opening a URL directly)

---

*Note: This changelog was introduced in version 1.2.12. For earlier version history, please refer to the [GitHub releases](https://github.com/YouG-o/YouTube_Custom_Settings/releases).*

[Unreleased]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.12.1...HEAD
[1.12.1]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.12.0...v1.12.1
[1.12.0]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.11.1...v1.12.0
[1.11.1]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.11.0...v1.11.1
[1.11.0]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.9.3...v1.10.0
[1.9.3]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.9.2...v1.9.3
[1.9.2]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.9.0...v1.9.2
[1.9.0]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.8.2...v1.9.0
[1.8.2]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.8.0...v1.8.2
[1.8.0]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.2.12...v1.3.0
[1.2.2]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.2.12...v1.2.2
[1.2.12]: https://github.com/YouG-o/YouTube_Custom_Settings/compare/v1.2.0...v1.2.12