# Changelog

All notable changes to PromptVault will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Dark mode functionality with persistent theme preference and proper Tailwind CSS configuration
- Enhanced full-text search across all prompt content and tags with keyword highlighting
- Support for multiple search terms (AND logic)
- Auto-generated prompt titles from content (internal use only, not displayed)
- Password protection for hidden prompts (password: "foobar")
- Hidden toggle in edit mode for existing prompts
- Context-aware tag filtering (tags only show for current view)
- Basic password obfuscation using base64 encoding
- Share/sync functionality via secure links for cross-device syncing
- Keyword highlighting in search results (content and tags)
- Direct chatbot integration (ChatGPT and Perplexity buttons)
- Context-aware hidden toggle in create form
- Rainbow color palette for all action buttons

### Changed
- Replaced "Your Prompts" header with "PromptVault"
- Hidden prompts are now completely separated from regular prompts
- Search is scoped to current view (hidden vs regular prompts)
- Tag list dynamically updates based on current view
- Lock icon changes to unlocked when hidden prompts are accessed
- Button colors follow rainbow palette: Export(Indigo), Import(Orange), Share(Yellow), +New(Green), Copy(Blue), Edit(Purple), Delete(Red)
- Create prompt form defaults to current view context (hidden toggle matches current mode)

### Removed
- Title display from prompt cards (content-only view)
- Created date display from prompt cards
- Manual title input field from prompt forms
- Hidden prompts from main "All Prompts" view
- Redundant manual sync button (auto-detection handles sync)

### Fixed
- Dark mode toggle now properly changes page appearance
- Dark mode styling consistency across all components
- Hidden prompts properly require password authentication
- Search functionality scoped to visible prompts only
- Tag extraction limited to current view context
- Chatbot links pre-fill prompts without auto-submitting

### Security
- Added basic obfuscation for hidden prompt password
- Share links contain all data encoded in URL (no server required)
- Note: Client-side only protection, suitable for demo/personal use