# Changelog

All notable changes to the Find and Replace module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning adapted for Foundry VTT modules:
`v{foundry version}.{major version}.{subversion}.{test subversion}`

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
