[![Foundry VTT Version](https://img.shields.io/badge/Foundry%20VTT-v13+-blue)](https://foundryvtt.com/)
[![Latest Release](https://img.shields.io/github/v/release/paulcheeba/find-and-replace)](https://github.com/paulcheeba/find-and-replace/releases/latest)
[![Downloads (All Time)](https://img.shields.io/github/downloads/paulcheeba/find-and-replace/total)](https://github.com/paulcheeba/find-and-replace/releases)
[![Downloads (Latest)](https://img.shields.io/github/downloads/paulcheeba/find-and-replace/latest/total)](https://github.com/paulcheeba/find-and-replace/releases/latest)

# Find and Replace for Foundry VTT

A module that adds comprehensive find and replace functionality to all ProseMirror editors in Foundry VTT v13+.

<img width="597" height="141" alt="image" src="https://github.com/user-attachments/assets/b69a3f4c-1d42-4ccf-98a6-39233ff4fe37" />


## Features

- **Find & Replace UI**: Adds a button to the ProseMirror toolbar that expands to reveal find and replace controls
- **Find Next/Previous**: Navigate through all matches in your document
- **Replace Current**: Replace the currently selected match
- **Replace All**: Replace all matches at once
- **Match Case**: Optional case-sensitive searching
- **Universal Support**: Works across all ProseMirror editors (journals, actor sheets, item descriptions, etc.)

## Installation

### Manual Installation

1. Download the latest release https://github.com/paulcheeba/find-and-replace/releases/latest/download/find-and-replace.zip
2. Extract the zip file to your Foundry VTT `Data/modules` folder
3. Restart Foundry VTT
4. Enable the module in your world's module settings

### Manifest URL

```
https://github.com/paulcheeba/find-and-replace/releases/latest/download/module.json
```

## Usage

1. Open any ProseMirror editor in Foundry VTT (journal entry, actor bio, item description, etc.)
2. Click the **Find & Replace** button in the editor toolbar (located next to the Source HTML button)
3. The toolbar will expand to show:
   - **Find field**: Enter your search term
   - **Find Next/Previous buttons**: Navigate between matches
   - **Replace field**: Enter replacement text
   - **Replace/Replace All buttons**: Replace one or all matches
   - **Match Case checkbox**: Toggle case-sensitive searching
4. Click the **Close** button to collapse the toolbar

## Compatibility

- **Foundry VTT Version**: v13 and above
- **System Compatibility**: Universal (works with all game systems)

## Known Limitations

- This module uses workarounds that may need updates if Foundry's ProseMirror implementation changes
- Performance with extremely large documents (10,000+ words) may vary
- Some known issues:
   - This module can be glitchy, I'll continue to work out the bugs now that the module is fully functional.
   - After typing in the Find form field press enter to commit the search, trying to click any button without first pressing enter will close the find/replace UI.
   - Sometimes you have to press the find/replace button a couple times before the UI pops up (actor biography for isntance).
   - A lot of this is due to how stubburn the ProseMirror UI is being handled by Foundry and my module's changes required some brute force.

## License

This module is licensed under the [MIT License](LICENSE).

## Credits

**Author**: paulcheeba (crusherDestroyer666)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
