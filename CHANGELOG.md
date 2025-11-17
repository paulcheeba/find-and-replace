# Changelog

All notable changes to the Find and Replace module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning adapted for Foundry VTT modules:
`v{foundry version}.{major version}.{subversion}.{test subversion}`

## [13.0.1.1] - 2025-11-16

### Changed
- Updated GitHub Actions workflows for automated releases
- Configured pre-release workflow for testing versions
- Improved release automation process

## [13.0.1.0] - 2025-11-16

### Added
- Comprehensive code comments throughout all JavaScript files
- Section headers for better code navigation
- Detailed inline documentation explaining technical decisions
- File versioning headers with change tracking

### Changed
- Updated file header format to include version, date, and changes
- Improved code maintainability with extensive commenting

### Documentation
- Added section comments to main.js (Global State, Foundry Hooks, Mutation Observer, etc.)
- Added section comments to ui-controller.js (Button Injection, UI Expansion/Collapse)
- Added section comments to find-replace-logic.js (Search, Navigation, Replace, Highlighting)
- Added section comments to CSS file (Toolbar Fixes, Button Styling)

## [13.0.0.5] - 2025-11-16

### Fixed
- Fixed menu height jitter during button re-injection (set height to 44px)
- Fixed `selection.constructor.near` error in clear() method
- Replaced broken ProseMirror selection with native `window.getSelection().removeAllRanges()`

### Changed
- Changed menu CSS from `min-height: 36px` to `height: 44px` for stability
- Updated clear() method to use native Selection API

### Technical
- Improved button persistence mechanism with 150ms debounce delay
- Removed processingElements Set approach (was blocking initial injection)
- Simplified mutation handler logic

## [13.0.0.0] - 2025-11-15

### Added
- Complete find and replace functionality for ProseMirror editors
- Automatic detection of ProseMirror editors across all Foundry applications
- Toolbar button injection with Font Awesome icon
- Expandable two-row UI with find and replace inputs
- Find Next/Previous navigation
- Match case toggle
- Replace current match functionality
- Replace all matches functionality
- Match counter display
- Complete CSS styling matching Foundry VTT's theme
- Keyboard shortcuts (Enter for Find Next)
- Responsive design for smaller screens

### Implementation
- **Editor Detection**: Hooks into `renderApplication` to detect all ProseMirror editors
- **UI Management**: Full expand/collapse interface with event handlers
- **Search Algorithm**: Uses ProseMirror's `doc.descendants()` to traverse document tree
- **Highlighting**: Uses ProseMirror selection to highlight current match
- **Replacement**: Uses ProseMirror transactions for safe document modification
- **Localization**: Full i18n support through language files

### Technical Details
- Works with ProseMirror v13+ API
- No dependencies beyond Foundry VTT core
- Defensive coding with null checks and error handling
- Clean, documented code structure

### Notes
- Module is feature-complete and ready for testing
- GitHub repository URL to be added after initial testing
- Future enhancements could include regex support and decorations-based highlighting
