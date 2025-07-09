# Product Requirements Document (PRD)

**Date:** July 05, 2025  
**Product Name:** PromptVault  
**Owner:** Douglas Kiang

---

## 1. Overview
PromptVault is a lightweight, web-based prompt manager designed for single users who want to quickly save, browse, and reuse AI prompts across devices without requiring an account. The product prioritizes simplicity, privacy, and minimal user friction. Users can create, edit, import/export prompts, and manage everything locally on their device unless shared explicitly via file export/import.

## 2. Problem Statement
AI users frequently write prompts they wish to reuse or refine over time. Existing tools are often heavyweight, require logins, or don't support simple workflows for saving and retrieving these prompts. There is no easy way to save prompts locally, organize them by project, and sync or share them securely without creating an account or relying on cloud storage.

## 3. Goals
- Enable quick saving and browsing of prompts  
- No login or account creation required  
- One-click copy to clipboard  
- Password-protected hidden prompts  
- Export/import prompts using standard formats (e.g., JSON, Markdown)

## 4. Features

### 4.1 Must-Have (MVP)
- Create/save new prompts
- Search functionality
- Edit/update existing prompts  
- Delete prompts  
- Export prompts to Markdown or JSON  
- Import prompts from file  
- Password-protected “Hidden” prompts
- Tags for organizing prompts
  - View, Edit, Delete tags

### 4.2 Nice-to-Have (Future)
- Tags are in alphabetical order
- GPT-suggested tags
  - Suggests existing tags where possible
- Fuzzy Matching for Tag Suggestions and Auto-Completion (next feature to be implemented)
- Version history / undo changes  
- Pin/favorite frequently used prompts  
- Dark mode and theme customization

## 5. Target Users
Single-user AI practitioners such as writers, researchers, developers, and hobbyists who frequently write and reuse prompts.

## 6. Usage Scenarios
- User quickly pastes in a new text prompt and sees a list of AI suggestions for tags. User clicks to toggle relevant tags and saves it with click
- User enters a search for a given keyword and sees a list of prompts with that keyword highlighted   
- User browses their list of saved prompts and clicks one to copy it to the clipboard
- User exports their prompts before switching devices  
- User imports prompts from a file on another device  
- User marks certain prompts as Hidden and unlocks them using a password

## 7. Technical Requirements
- Built as a responsive web app (HTML/CSS/JS, or React preferred)  
- Prompts stored locally in browser storage (e.g., IndexedDB or localStorage)  
- Optional encrypted data for Hidden prompts  
- No backend required unless syncing evolves beyond peer-to-peer

## 8. UI/UX Requirements
- Minimalist interface inspired by Notion or Bear  
- List view with prompt content and tags  
- One-click to copy prompt  
- Quick access to create/edit/delete  
- Visual indicator for Hidden prompts
- Data Management (Export/Import) and AI key management available in the Settings modal
