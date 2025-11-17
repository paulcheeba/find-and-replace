/**
 * UI Controller Module
 * 
 * Manages the user interface for find and replace:
 * - Toolbar button injection
 * - Expanded toolbar UI
 * - User interaction handling
 * - UI state management
 * 
 * @module ui-controller
 */

import { FindReplaceLogic } from './find-replace-logic.js';

/**
 * ui-controller.js
 * Version: 13.0.1.0
 * Last Updated: 2025-11-16
 * Changes: Added comprehensive code comments for better maintainability
 * 
 * UIController Class
 * Manages the find and replace UI in the ProseMirror editor toolbar.
 * Handles button creation, UI expansion/collapse, and user interactions.
 */

/* ========================================
 * UICONTROLLER CLASS
 * ======================================== */

class UIController {
  
  /**
   * Constructor
   * @param {EditorView} editorView - ProseMirror EditorView (or mock)
   * @param {HTMLElement} toolbar - The menu.editor-menu toolbar element
   */
  constructor(editorView, toolbar) {
    this.view = editorView;                    // EditorView instance (real or mock)
    this.logic = new FindReplaceLogic(editorView); // Core find/replace logic
    this.isExpanded = false;                   // Is the expanded UI showing?
    this.toolbarElement = toolbar;             // Toolbar element to inject button into
    this.expandedUI = null;                    // Reference to expanded UI container
    this.button = null;                        // Reference to main toolbar button
  }
  
  /* ========================================
   * BUTTON INJECTION
   * ======================================== */
  
  /**
   * Inject the find and replace button into the editor toolbar
   * 
   * Creates a button with Font Awesome search icon and positions it
   * near the Source HTML button in the toolbar.
   * 
   * Called by:
   * - Initial setup (main.js creates new controller)
   * - Re-injection after element replacement (existing controller reused)
   */
  injectButton() {
    console.log('UIController | Injecting find and replace button');
    
    // === CREATE BUTTON ELEMENT ===
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'find-replace-button';
    button.title = game.i18n.localize('find-and-replace.button.tooltip') || 'Find and Replace';
    button.setAttribute('aria-label', 'Find and Replace');
    
    // === ADD FONT AWESOME ICON ===
    const icon = document.createElement('i');
    icon.className = 'fas fa-search'; // Magnifying glass icon
    button.appendChild(icon);
    
    // === ATTACH CLICK HANDLER ===
    button.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleExpanded(); // Show/hide expanded UI
    });
    
    // === POSITION BUTTON IN TOOLBAR ===
    // Try to find Source HTML button to position next to it
    const sourceButton = this.toolbarElement.querySelector(
      'button[data-action*="source"], button[title*="Source"], .editor-source, [class*="source"]'
    );
    
    if (sourceButton) {
      // Insert after the source button for consistent placement
      sourceButton.parentNode.insertBefore(button, sourceButton.nextSibling);
    } else {
      // Fallback: append to end of toolbar
      this.toolbarElement.appendChild(button);
    }
    
    // Store reference for later use (state restoration, removal, etc.)
    this.button = button;
    console.log('UIController | Button injected successfully');
  }
  
  /* ========================================
   * UI EXPANSION/COLLAPSE
   * ======================================== */
  
  /**
   * Toggle the expanded find and replace UI
   */
  toggleExpanded() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }
  
  /**
   * Expand the toolbar to show find and replace controls
   * 
   * Creates a two-row interface:
   * Row 1: Find input + Find button + Next/Previous buttons + Close button + Counter
   * Row 2: Replace input + Replace button + Replace All button + Match Case checkbox
   */
  expand() {
    console.log('UIController | Expanding find and replace UI');
    
    this.isExpanded = true;
    this.button.classList.add('active');
    
    // Create container for expanded UI
    const container = document.createElement('div');
    container.className = 'find-replace-expanded';
    
    // Prevent clicks inside the container from closing it
    container.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Find row
    const findRow = document.createElement('div');
    findRow.className = 'find-replace-find-row';
    
    const findInput = document.createElement('input');
    findInput.type = 'text';
    findInput.className = 'find-replace-input';
    findInput.placeholder = game.i18n.localize('find-and-replace.find.placeholder') || 'Find (press Enter)...';
    findInput.setAttribute('aria-label', 'Find');
    
    const findNextBtn = document.createElement('button');
    findNextBtn.type = 'button';
    findNextBtn.className = 'find-replace-nav-button';
    findNextBtn.title = game.i18n.localize('find-and-replace.find.next') || 'Find Next';
    findNextBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
    findNextBtn.addEventListener('click', () => this.onFindNext());
    
    const findPrevBtn = document.createElement('button');
    findPrevBtn.type = 'button';
    findPrevBtn.className = 'find-replace-nav-button';
    findPrevBtn.title = game.i18n.localize('find-and-replace.find.previous') || 'Find Previous';
    findPrevBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    findPrevBtn.addEventListener('click', () => this.onFindPrevious());
    
    const matchCaseLabel = document.createElement('label');
    matchCaseLabel.className = 'find-replace-match-case';
    const matchCaseCheckbox = document.createElement('input');
    matchCaseCheckbox.type = 'checkbox';
    matchCaseCheckbox.id = 'find-replace-match-case-' + Date.now();
    matchCaseLabel.appendChild(matchCaseCheckbox);
    matchCaseLabel.appendChild(document.createTextNode(' ' + (game.i18n.localize('find-and-replace.find.matchCase') || 'Match Case')));
    
    const counter = document.createElement('span');
    counter.className = 'find-replace-counter';
    counter.textContent = '';
    
    findRow.appendChild(findInput);
    findRow.appendChild(findPrevBtn);
    findRow.appendChild(findNextBtn);
    findRow.appendChild(matchCaseLabel);
    findRow.appendChild(counter);
    
    // Replace row
    const replaceRow = document.createElement('div');
    replaceRow.className = 'find-replace-replace-row';
    
    const replaceInput = document.createElement('input');
    replaceInput.type = 'text';
    replaceInput.className = 'find-replace-input';
    replaceInput.placeholder = game.i18n.localize('find-and-replace.replace.placeholder') || 'Replace...';
    replaceInput.setAttribute('aria-label', 'Replace');
    
    const replaceBtn = document.createElement('button');
    replaceBtn.type = 'button';
    replaceBtn.className = 'find-replace-action-button';
    replaceBtn.textContent = game.i18n.localize('find-and-replace.replace.replaceCurrent') || 'Replace';
    replaceBtn.addEventListener('click', () => this.onReplace());
    
    const replaceAllBtn = document.createElement('button');
    replaceAllBtn.type = 'button';
    replaceAllBtn.className = 'find-replace-action-button';
    replaceAllBtn.textContent = game.i18n.localize('find-and-replace.replace.replaceAll') || 'Replace All';
    replaceAllBtn.addEventListener('click', () => this.onReplaceAll());
    
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'find-replace-close-button';
    closeBtn.title = game.i18n.localize('find-and-replace.close') || 'Close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => this.collapse());
    
    replaceRow.appendChild(replaceInput);
    replaceRow.appendChild(replaceBtn);
    replaceRow.appendChild(replaceAllBtn);
    replaceRow.appendChild(closeBtn);
    
    container.appendChild(findRow);
    container.appendChild(replaceRow);
    
    // Insert after the toolbar
    this.toolbarElement.parentNode.insertBefore(container, this.toolbarElement.nextSibling);
    
    this.expandedUI = {
      container,
      findInput,
      replaceInput,
      matchCaseCheckbox,
      counter
    };
    
    // Allow Enter to trigger search
    findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // If already has matches, find next. Otherwise, start new search
        if (this.logic.currentMatches.length > 0 && this.logic.searchTerm === findInput.value) {
          this.onFindNext();
        } else {
          this.onFindClick();
        }
      }
    });
    
    // Focus the find input
    setTimeout(() => findInput.focus(), 50);
  }
  
  /**
   * Collapse the expanded UI
   */
  collapse() {
    console.log('UIController | Collapsing find and replace UI');
    
    if (!this.isExpanded) return;
    
    this.isExpanded = false;
    this.button.classList.remove('active');
    
    // Remove expanded UI elements
    if (this.expandedUI && this.expandedUI.container) {
      this.expandedUI.container.remove();
    }
    
    this.expandedUI = null;
    
    // Clear search state
    this.logic.clear();
  }
  
  /**
   * Handle find input change - triggers search
   */
  onFindClick() {
    if (!this.expandedUI) return;
    
    const searchTerm = this.expandedUI.findInput.value;
    const matchCase = this.expandedUI.matchCaseCheckbox.checked;
    
    if (!searchTerm) {
      this.logic.clear();
      this.expandedUI.counter.textContent = '';
      return;
    }
    
    const matches = this.logic.findAll(searchTerm, matchCase);
    
    // Update counter
    if (matches.length === 0) {
      this.expandedUI.counter.textContent = game.i18n.localize('find-and-replace.notifications.noMatches') || 'No matches';
    } else {
      const current = this.logic.currentMatchIndex + 1;
      this.expandedUI.counter.textContent = `${current} of ${matches.length}`;
    }
  }
  
  /**
   * Handle find next button click
   */
  onFindNext() {
    this.logic.findNext();
    
    // Update counter
    if (this.expandedUI && this.logic.currentMatches.length > 0) {
      const current = this.logic.currentMatchIndex + 1;
      const total = this.logic.currentMatches.length;
      this.expandedUI.counter.textContent = `${current} of ${total}`;
    }
  }
  
  /**
   * Handle find previous button click
   */
  onFindPrevious() {
    this.logic.findPrevious();
    
    // Update counter
    if (this.expandedUI && this.logic.currentMatches.length > 0) {
      const current = this.logic.currentMatchIndex + 1;
      const total = this.logic.currentMatches.length;
      this.expandedUI.counter.textContent = `${current} of ${total}`;
    }
  }
  
  /**
   * Handle replace button click
   */
  onReplace() {
    if (!this.expandedUI) return;
    
    const replaceText = this.expandedUI.replaceInput.value;
    const success = this.logic.replaceCurrent(replaceText);
    
    if (success) {
      // Re-run search to update matches
      this.onFindClick();
    }
  }
  
  /**
   * Handle replace all button click
   */
  onReplaceAll() {
    if (!this.expandedUI) return;
    
    const replaceText = this.expandedUI.replaceInput.value;
    const count = this.logic.replaceAll(replaceText);
    
    if (count > 0) {
      ui.notifications?.info(game.i18n.format('find-and-replace.notifications.replaced', {count}) || `Replaced ${count} occurrence(s)`);
    }
    
    // Clear search after replace all
    this.expandedUI.findInput.value = '';
    this.expandedUI.replaceInput.value = '';
    this.onFindClick();
  }
}
