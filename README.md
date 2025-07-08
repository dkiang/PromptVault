# PromptVault

A modern, feature-rich prompt management application built with SvelteKit. Store, organize, and search your AI prompts with ease.

## Features

- **Content-Only Display**: Clean interface showing only prompt content and tags (no titles)
- **Full-text Search with Highlighting**: Search across all prompt content and tags with visual keyword highlighting
- **Share/Sync**: Generate secure links to sync prompts across devices without accounts
- **Chatbot Integration**: Open prompts directly in ChatGPT or Perplexity using blue underlined text links
- **Dark Mode**: Toggle between light and dark themes with persistent preference
- **Tag System**: Organize prompts with custom tags that update based on current view
- **Hidden Prompts**: Password-protected prompts (password: "foobar") completely separated from regular view
- **Context-Aware Interface**: Tags, search scope, and create form automatically adjust to current view
- **Rainbow UI**: Color-coded action buttons for intuitive navigation
- **Export/Import**: Backup and restore your prompts via JSON files
- **Edit Mode**: Full editing capabilities including hidden status toggle
- **Mobile-First Responsive Design**: Fully optimized for mobile, tablet, and desktop devices
- **Touch-Optimized Interface**: 44px minimum touch targets and mobile-friendly interactions
- **Landscape Orientation Support**: Compact layouts optimized for landscape viewing

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/PromptVault.git
   cd PromptVault
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### Creating Prompts

1. Click the **"+ New Prompt"** button (green)
2. Enter your prompt content in the textarea
3. Add tags (optional, comma-separated)
4. Hidden toggle automatically matches current view (on when in hidden mode, off otherwise)
5. Click **"Create Prompt"**

Prompts are displayed showing only their content and tags for a clean, distraction-free interface.

### Searching Prompts

- Use the search bar in the sidebar to search across all prompt content and tags
- **Keyword highlighting**: Matching terms are highlighted in yellow throughout content and tags
- Search supports multiple terms (all terms must match)
- Search is automatically scoped to your current view (regular or hidden prompts)
- Filter by tags using the tag list in the sidebar
- Tag list updates dynamically based on current view (hidden vs regular)

### Managing Prompts

- **Chatbot Integration**: Click the blue underlined text links labeled **Open in: ChatGPT | Perplexity** below each prompt to open the prompt in ChatGPT or Perplexity with the content pre-filled.
- **Copy**: Click the "Copy" button (blue) to copy prompt content to clipboard
- **Edit**: Click the "Edit" button (purple) to modify content, tags, and hidden status
- **Delete**: Click the "Delete" button (red) to remove a prompt

### Sharing & Syncing

Export, Import, and Share functions are located in the sidebar under the "Data Management" section:

- **Export**: Click "Export" (indigo) to download prompts as JSON file
- **Import**: Click "Import" (orange) to upload prompts from JSON file
- **Share**: Click "Share" (yellow) to generate a secure link containing all prompts
- **Auto-sync**: Opening a share link automatically prompts to import prompts
- **Cross-device**: Share links work across any device/browser without accounts

### Hidden Prompts

**Note:** The Hidden prompts feature is disabled by default and can only be enabled via browser DevTools.

**To enable Hidden prompts:**
1. Open your browser's Developer Tools (F12 or right-click → Inspect)
2. Go to the Console tab
3. Run this command:
   ```javascript
   const config = JSON.parse(localStorage.getItem('promptvault_config') || '{}');
   config.features = config.features || {};
   config.features.hiddenPrompts = true;
   localStorage.setItem('promptvault_config', JSON.stringify(config));
   location.reload();
   ```
4. Refresh the page - the "🔒 Hidden" link will appear in the sidebar

**To disable Hidden prompts:**
1. In DevTools Console, run:
   ```javascript
   const config = JSON.parse(localStorage.getItem('promptvault_config') || '{}');
   config.features = config.features || {};
   config.features.hiddenPrompts = false;
   localStorage.setItem('promptvault_config', JSON.stringify(config));
   location.reload();
   ```

**Using Hidden prompts (when enabled):**
- Click **"🔒 Hidden"** in the sidebar to access password-protected prompts
- Enter password: **"foobar"** when prompted
- Hidden prompts are completely separate from regular prompts
- Lock icon changes to 🔓 when unlocked
- Switching away from hidden view automatically locks it again
- Creating prompts in hidden mode automatically sets them as hidden

### Dark Mode & UI

- **Dynamic Dark Mode Toggle**: Click the theme button in the sidebar - shows "🌙 Dark Mode" in light mode, "🌞 Light Mode" in dark mode
- **Rainbow color scheme**: All buttons use distinct colors for easy identification
- **Desktop Layout**: Persistent sidebar with tags and data management tools always visible
- **Mobile Layout**: Collapsible hamburger menu with sidebar overlay for optimal mobile experience
- **Responsive Navigation**: Sidebar automatically adapts to screen size and device orientation
- **Touch-Friendly**: All interactive elements meet accessibility standards with proper touch targets
- Persistent theme preference across sessions

## Mobile & Responsive Features

PromptVault is built mobile-first with extensive responsive design optimizations:

### Mobile Navigation
- **Hamburger Menu**: Tap the menu icon (≡) to open/close the sidebar on mobile devices
- **Overlay Design**: Sidebar slides over content with backdrop overlay for intuitive mobile UX
- **Gesture Support**: Tap outside the sidebar to close it on mobile

### Touch Optimization
- **44px Touch Targets**: All buttons meet WCAG accessibility standards for touch interaction
- **Touch Manipulation**: Optimized touch response and gesture handling
- **Button Sizing**: Responsive button sizing that adapts to screen size and orientation

### Responsive Layouts
- **Adaptive Grid**: Prompt cards automatically adjust from 1 column (mobile) to 2 columns (tablet) to 3 columns (desktop)
- **Flexible Typography**: Text sizes scale appropriately across devices (xl/2xl on desktop, lg/xl on mobile)
- **Smart Spacing**: Padding and margins adapt to screen size for optimal content density

### Landscape Support
- **Compact Mode**: Special landscape orientation optimizations for devices with limited height
- **Reduced Spacing**: Tighter layouts when in landscape mode on mobile devices
- **Viewport Optimization**: Enhanced viewport handling with `viewport-fit=cover` for modern devices

### Cross-Device Experience
- **Consistent Functionality**: All features work identically across desktop, tablet, and mobile
- **Responsive Modals**: Forms and dialogs adapt to screen size with proper mobile scrolling
- **Share Link Optimization**: Long URLs wrap properly and copy buttons are touch-friendly

## Development

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── CreatePromptForm.svelte
│   │   ├── PromptCard.svelte
│   │   ├── SearchBar.svelte
│   │   └── ...
│   └── storage.ts
├── routes/
│   ├── +layout.svelte
│   └── +page.svelte
└── app.html
```

## Technologies Used

- **SvelteKit**: Full-stack web framework
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **IndexedDB**: Client-side storage
- **Vite**: Build tool and development server

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Security Note

PromptVault uses client-side storage and basic password protection suitable for personal use and demo purposes. The hidden prompt password is obfuscated but not truly secure since this is a client-side only application. The Hidden prompts feature is disabled by default and requires DevTools access to enable, providing an additional layer of obscurity. For production use with sensitive data, consider implementing server-side authentication.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/your-username/PromptVault/issues) on GitHub.