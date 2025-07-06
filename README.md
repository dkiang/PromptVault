# PromptVault

A modern, feature-rich prompt management application built with SvelteKit. Store, organize, and search your AI prompts with ease.

## Features

- **Content-Only Display**: Clean interface showing only prompt content and tags (no titles)
- **Full-text Search**: Search across all prompt content and tags with multiple terms
- **Dark Mode**: Toggle between light and dark themes with persistent preference
- **Tag System**: Organize prompts with custom tags that update based on current view
- **Hidden Prompts**: Password-protected prompts (password: "foobar") completely separated from regular view
- **Context-Aware Interface**: Tags and search scope automatically adjust to current view
- **Export/Import**: Backup and restore your prompts
- **Edit Mode**: Full editing capabilities including hidden status toggle
- **Responsive Design**: Works seamlessly on desktop and mobile

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

1. Click the **"+ New Prompt"** button
2. Enter your prompt content in the textarea
3. Add tags (optional, comma-separated)
4. Mark as hidden if needed (requires password to view later)
5. Click **"Create Prompt"**

Prompts are displayed showing only their content and tags for a clean, distraction-free interface.

### Searching Prompts

- Use the search bar in the sidebar to search across all prompt content and tags
- Search supports multiple terms (all terms must match)
- Search is automatically scoped to your current view (regular or hidden prompts)
- Filter by tags using the tag list in the sidebar
- Tag list updates dynamically based on current view (hidden vs regular)

### Managing Prompts

- **Edit**: Click the "Edit" button on any prompt card to modify content, tags, and hidden status
- **Copy**: Click the "Copy" button to copy prompt content to clipboard
- **Delete**: Click the "Delete" button to remove a prompt
- **Hidden Toggle**: In edit mode, you can change whether a prompt is hidden or visible

### Hidden Prompts

- Click **"🔒 Hidden"** in the sidebar to access password-protected prompts
- Enter password: **"foobar"** when prompted
- Hidden prompts are completely separate from regular prompts
- Lock icon changes to 🔓 when unlocked
- Switching away from hidden view automatically locks it again

### Dark Mode

Click the "Toggle Dark Mode" button in the sidebar to switch between light and dark themes. Your preference is automatically saved.

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

PromptVault uses client-side storage and basic password protection suitable for personal use and demo purposes. The hidden prompt password is obfuscated but not truly secure since this is a client-side only application. For production use with sensitive data, consider implementing server-side authentication.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/your-username/PromptVault/issues) on GitHub.