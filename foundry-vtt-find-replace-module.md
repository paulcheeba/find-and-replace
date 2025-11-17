# Foundry VTT Find & Replace Module Development

You are an expert Foundry VTT module developer. Your task is to create a complete, production-ready module that adds find and replace functionality to all ProseMirror editors in Foundry VTT v13+.

## Project Setup

This module will be developed in the current workspace, which is a local git repository named "Find-and-Replace". Create all necessary folders, files, and project structure to begin development immediately.

### Module Identity
- **Module ID**: `find-and-replace`
- **Module Name**: Find and Replace
- **Description**: Adds find and replace functionality to ProseMirror editors in Foundry VTT
- **Author**: paulcheeba (crusherDestroyer666)
- **Version**: v13.0.0.0 (follows pattern: v{foundry version}.{major version}.{subversion}.{test subversion})
- **License**: MIT
- **Target Compatibility**: Foundry VTT v13+
- **Distribution**: Open source, will be hosted on GitHub after initial local testing

## Context

Foundry VTT v13 replaced TinyMCE with ProseMirror as its default text editor. While ProseMirror supports search/replace extensions, Foundry VTT does not currently expose:
- A built-in find & replace dialog
- An official API hook (`configureProseMirrorPlugins`) to inject ProseMirror plugins safely (the feature request is still open on GitHub)

Despite these limitations, we need to create a module that safely injects find/replace functionality into ProseMirror editors across all Foundry contexts (journals, actor sheets, item descriptions, etc.).

## Feature Specifications

### UI Integration
- **Button Placement**: Add a "Find & Replace" button to the ProseMirror toolbar, positioned directly adjacent to the "Source HTML" button
- **Button Icon**: Use an appropriate Font Awesome icon for find/replace functionality (e.g., `fa-search`, `fa-search-plus`, or `fa-replace`)
- **Toolbar Expansion**: When clicked, the toolbar expands to reveal two additional rows:
  - Row 1: "Find" text input field with navigation controls (Find Next, Find Previous)
  - Row 2: "Replace" text input field with action controls (Replace, Replace All)
  - Close button that reverts the toolbar to its original state
- **Visual Design**: Match Foundry VTT's existing UI theme and styling

### Functionality
- **Find**: Search through the document and highlight all matches
- **Find Next/Previous**: Navigate between matches
- **Replace**: Replace the current match
- **Replace All**: Replace all matches in the document
- **Match Case**: Toggle for case-sensitive searching
- **Close**: Collapse the expanded toolbar and clear search state

### Technical Requirements
- Works in **all** ProseMirror editors throughout Foundry VTT (journals, sheets, items, actors, etc.)
- Uses ProseMirror transactions and commands to safely modify content without breaking document structure
- Preserves formatting and node structure during replacements
- Handles edge cases: empty searches, no matches, special characters in search terms
- Implements defensive coding with version compatibility checks
- Designed to be maintained and updated as Foundry VTT evolves
- Keep implementation simple - focus on core find/replace functionality

## Reference Documentation

Consult these resources during development:

**Foundry VTT Knowledge Base:**
- Module Development Guide: https://foundryvtt.com/kb/module-development/
- Module Development Tutorial: https://foundryvtt.com/article/module-development/
- ProseMirror Editor API: https://foundryvtt.com/api/classes/foundry.prosemirror.ProseMirrorEditor.html
- Application API: https://foundryvtt.com/api/classes/client.Application.html
- Hooks Documentation: https://foundryvtt.com/api/modules/hookEvents.html

**ProseMirror Documentation:**
- ProseMirror Guide: https://prosemirror.net/docs/guide/
- ProseMirror Reference: https://prosemirror.net/docs/ref/
- State and Transactions: https://prosemirror.net/docs/guide/#state
- Commands: https://prosemirror.net/docs/guide/#commands

## Project Deliverables

Create a complete module structure with:

1. **module.json** - Module manifest with proper metadata, compatibility, and dependencies
   - ID: `find-and-replace`
   - Title: Find and Replace
   - Description: Adds find and replace functionality to ProseMirror editors in Foundry VTT
   - Version: 13.0.0.0
   - Author: paulcheeba (crusherDestroyer666)
   - License: MIT
   - Compatibility: minimum v13, verified v13
2. **scripts/** - JavaScript modules for:
   - ProseMirror plugin injection and editor detection
   - Find/replace logic and transaction handling
   - UI dialog/toolbar expansion system
   - Hook implementations
3. **styles/** - CSS for the expanded toolbar matching Foundry's theme
4. **languages/en.json** - Localization strings
5. **README.md** - Installation, usage instructions, known limitations, contribution guidelines
   - Note: GitHub repository URL will be added after initial testing phase
6. **LICENSE** - MIT License with paulcheeba as copyright holder
7. **.gitignore** - Standard Node/Foundry ignores
8. **CHANGELOG.md** - Version history starting with v13.0.0.0

## Technical Approach

Since Foundry doesn't provide an official hook for ProseMirror plugins:
- Hook into editor initialization (explore `renderProseMirrorEditor` or similar hooks)
- Safely inject custom ProseMirror plugins when editors are created
- Use Foundry's Application class hooks to detect when editors render
- Implement proper cleanup to avoid memory leaks
- Add version checks and graceful degradation if APIs change

## Code Quality Standards

- Include comprehensive code comments explaining technical decisions
- Document potential risks and breaking points for future Foundry updates
- Follow Foundry VTT and JavaScript best practices
- Use ES6+ module syntax
- Implement error handling and user feedback
- Make code maintainable for long-term updates

## Development Workflow

This module is being developed locally using GitHub Desktop. After initial testing and validation:
1. An online GitHub repository will be created
2. Code will be pushed to a versioned branch
3. Public distribution will begin

## Getting Started

Begin by creating the complete project structure in this workspace, then implement the core functionality step by step. Provide clear explanations of your approach and any technical challenges or workarounds needed.
