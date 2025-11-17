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

1. Download the latest release from the [GitHub repository](#) (link to be added after initial testing)
2. Extract the zip file to your Foundry VTT `Data/modules` folder
3. Restart Foundry VTT
4. Enable the module in your world's module settings

### Manifest URL

```
[Manifest URL to be added after initial testing]
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

- Foundry VTT v13 does not provide an official API hook for ProseMirror plugin injection
- This module uses workarounds that may need updates if Foundry's ProseMirror implementation changes
- Performance with extremely large documents (10,000+ words) may vary

## License

This module is licensed under the [MIT License](LICENSE).

## Credits

**Author**: paulcheeba (crusherDestroyer666)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
