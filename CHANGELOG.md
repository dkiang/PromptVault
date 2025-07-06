# Changelog

All notable changes to PromptVault will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Dark mode functionality with persistent theme preference and proper Tailwind CSS configuration
- Enhanced full-text search across all prompt content and tags
- Support for multiple search terms (AND logic)
- Auto-generated prompt titles from content (internal use only, not displayed)
- Password protection for hidden prompts (password: "foobar")
- Hidden toggle in edit mode for existing prompts
- Context-aware tag filtering (tags only show for current view)
- Basic password obfuscation using base64 encoding

### Changed
- Replaced "Your Prompts" header with "PromptVault"
- Hidden prompts are now completely separated from regular prompts
- Search is scoped to current view (hidden vs regular prompts)
- Tag list dynamically updates based on current view
- Lock icon changes to unlocked when hidden prompts are accessed

### Removed
- Title display from prompt cards (content-only view)
- Created date display from prompt cards
- Manual title input field from prompt forms
- Hidden prompts from main "All Prompts" view

### Fixed
- Dark mode toggle now properly changes page appearance
- Dark mode styling consistency across all components
- Hidden prompts properly require password authentication
- Search functionality scoped to visible prompts only
- Tag extraction limited to current view context

### Security
- Added basic obfuscation for hidden prompt password
- Note: Client-side only protection, suitable for demo/personal use