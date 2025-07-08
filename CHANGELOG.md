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
- Direct chatbot integration (ChatGPT and Perplexity) via blue underlined text links
- Context-aware hidden toggle in create form
- Rainbow color palette for all action buttons
- Password management system with change and reset functionality
- Secure password storage in IndexedDB settings store
- Password change with current password verification
- Password reset with deletion of all hidden prompts
- Comprehensive security warnings for password reset operations
- Runtime configuration system for feature toggles without recompilation
- Hidden prompts feature disabled by default (DevTools-only enable)
- Default password can be changed via configuration interface
- **Full mobile responsiveness and touch optimization**
- **Hamburger menu navigation for mobile devices**
- **Landscape orientation support with compact layouts**
- **Touch-friendly buttons with 44px minimum touch targets**
- **Mobile-optimized modals and forms**
- **Responsive breakpoints throughout the application**

### Changed
- Replaced "Your Prompts" header with "PromptVault"
- Hidden prompts are now completely separated from regular prompts
- Search is scoped to current view (hidden vs regular prompts)
- Tag list dynamically updates based on current view
- Lock icon changes to unlocked when hidden prompts are accessed
- Button colors follow rainbow palette: Export(Indigo), Import(Orange), Share(Yellow), +New(Green), Copy(Blue), Edit(Purple), Delete(Red)
- Create prompt form defaults to current view context (hidden toggle matches current mode)
- Password system now uses IndexedDB storage instead of hardcoded base64 encoding
- Database version incremented to 2.0 to support password settings store
- Configuration system uses localStorage for persistent runtime settings
- All hidden prompts UI elements are conditionally rendered based on configuration
- Settings UI removed - Hidden feature toggle now DevTools-only
- Chatbot integration UI now uses blue underlined text links ("Open in: ChatGPT | Perplexity") instead of buttons or icons
- **Desktop layout: Sidebar always visible on large screens with proper content flow**
- **Mobile layout: Collapsible sidebar with overlay for small screens**
- **Dark mode toggle: Dynamic text and emoji based on current mode (🌙 Dark Mode / 🌞 Light Mode)**
- **Export/Import/Share buttons moved to sidebar under "Data Management" section**
- **New Prompt button enlarged for better readability on all devices**
- **Removed underlines from sidebar navigation links for cleaner appearance**

### Removed
- Title display from prompt cards (content-only view)
- Created date display from prompt cards
- Manual title input field from prompt forms
- Hidden prompts from main "All Prompts" view
- Redundant manual sync button (auto-detection handles sync)
- Settings UI panel and ConfigManager component

### Fixed
- Dark mode toggle now properly changes page appearance
- Dark mode styling consistency across all components
- Hidden prompts properly require password authentication
- Search functionality scoped to visible prompts only
- Tag extraction limited to current view context
- Chatbot links pre-fill prompts without auto-submitting
- **Sidebar visibility persistence on desktop screens without flash**
- **Sidebar positioning to prevent content overlap on desktop**
- **Touch target accessibility with proper minimum sizes**
- **Modal overflow and scrolling on mobile devices**
- **Responsive text sizing and spacing for different screen sizes**

### Security
- Added basic obfuscation for hidden prompt password
- Share links contain all data encoded in URL (no server required)
- Password management with secure storage in IndexedDB
- Current password verification required for all password operations
- Comprehensive security warnings for destructive operations
- Note: Client-side only protection, suitable for demo/personal use