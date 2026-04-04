/**
 * Find and Replace Logic Module
 * 
 * Core functionality for finding and replacing text in ProseMirror documents:
 * - Text search and highlighting
 * - Match navigation
 * - Replace operations
 * - Match case handling
 * 
 * @module find-replace-logic
 */

/**
 * Class that implements find and replace operations
 */
/**
 * find-replace-logic.js
 * Version: 13.0.1.0
 * Last Updated: 2025-11-16
 * Changes: Added comprehensive code comments for better maintainability
 * 
 * FindReplaceLogic Class
 * Core logic for finding and replacing text in ProseMirror documents.
 * Uses ProseMirror API for accurate text matching and replacement.
 */

/* ========================================
 * FINDREPLACELOGIC CLASS
 * ======================================== */

export class FindReplaceLogic {
  
  /**
   * Constructor
   * @param {EditorView} editorView - ProseMirror EditorView (or mock)
   */
  constructor(editorView) {
    this.view = editorView;              // EditorView instance (real or mock)
    this.currentMatches = [];            // Array of {from, to} position objects
    this.currentMatchIndex = -1;         // Index of currently highlighted match (-1 = none)
    this.searchTerm = '';                // Current search term
    this.matchCase = false;              // Case-sensitive search enabled?
  }
  
  /* ========================================
   * SEARCH METHODS
   * ======================================== */
  
  /**
   * Find all matches of a search term in the document
   * 
   * Traverses the ProseMirror document tree looking for text nodes,
   * searches each text node for matches, and stores positions.
   * 
   * @param {string} searchTerm - Text to search for
   * @param {boolean} matchCase - Whether to match case
   * @returns {Array} Array of match positions {from, to}
   */
  findAll(searchTerm, matchCase = false) {
    console.log('FindReplaceLogic | Finding all matches for:', searchTerm);
    
    // === RESET STATE ===
    this.searchTerm = searchTerm;
    this.matchCase = matchCase;
    this.currentMatches = [];
    this.currentMatchIndex = -1;
    
    // Clear if no search term
    if (!searchTerm) {
      this.clear();
      return [];
    }
    
    const state = this.view.state;
    const doc = state.doc; // ProseMirror document
    
    // === PREPARE SEARCH STRING ===
    // Convert to lowercase if case-insensitive
    const searchStr = matchCase ? searchTerm : searchTerm.toLowerCase();
    
    // === TRAVERSE DOCUMENT ===
    // doc.descendants() visits every node in the document tree
    doc.descendants((node, pos) => {
      if (node.isText) {
        // Get text content (lowercase if case-insensitive)
        const text = matchCase ? node.text : node.text.toLowerCase();
        let index = 0;
        
        // === FIND ALL OCCURRENCES IN THIS TEXT NODE ===
        while ((index = text.indexOf(searchStr, index)) !== -1) {
          // Calculate absolute positions in document
          // pos = position of node start, index = offset within node
          const from = pos + index;
          const to = from + searchTerm.length;
          
          this.currentMatches.push({from, to});
          
          index += searchTerm.length; // Move past this match to find next
        }
      }
    });
    
    console.log(`FindReplaceLogic | Found ${this.currentMatches.length} matches`);
    
    // === AUTO-SELECT FIRST MATCH ===
    if (this.currentMatches.length > 0) {
      this.currentMatchIndex = 0;
      this.highlightMatches();  // Highlight all matches
      this.scrollToMatch(0);    // Scroll to first match
    }
    
    return this.currentMatches;
  }
  
  /* ========================================
   * NAVIGATION METHODS
   * ======================================== */
  
  /**
   * Navigate to the next match
   * Wraps around to first match after last one.
   */
  findNext() {
    if (this.currentMatches.length === 0) return;
    
    // Increment with wraparound using modulo
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.currentMatches.length;
    this.highlightMatches();
    this.scrollToMatch(this.currentMatchIndex);
  }
  
  /**
   * Navigate to the previous match
   * Wraps around to last match after first one.
   */
  findPrevious() {
    if (this.currentMatches.length === 0) return;
    
    // Decrement index
    this.currentMatchIndex = this.currentMatchIndex - 1;
    // Wraparound to end if we go below 0
    if (this.currentMatchIndex < 0) {
      this.currentMatchIndex = this.currentMatches.length - 1;
    }
    
    this.highlightMatches();
    this.scrollToMatch(this.currentMatchIndex);
  }
  
  /* ========================================
   * REPLACE METHODS
   * ======================================== */
  
  /**
   * Replace the current match
   * 
   * Creates a ProseMirror transaction to replace text at the current match position,
   * then re-runs search to update match list and positions.
   * 
   * @param {string} replaceText - Text to replace with
   * @returns {boolean} Whether replacement was successful
   */
  replaceCurrent(replaceText) {
    // Check if we have a valid current match
    if (this.currentMatches.length === 0 || this.currentMatchIndex < 0) {
      return false;
    }
    
    const match = this.currentMatches[this.currentMatchIndex]; // {from, to} positions
    
    // === CREATE TRANSACTION ===
    // Transaction is ProseMirror's way of modifying documents
    const tr = this.view.state.tr;
    if (!tr) {
      console.error('FindReplaceLogic | Failed to create transaction');
      return false;
    }
    
    // === REPLACE TEXT ===
    // insertText(text, from, to) replaces text from position 'from' to 'to'
    tr.insertText(replaceText, match.from, match.to);
    
    // === DISPATCH TRANSACTION ===
    // Applies changes to editor (calls mock dispatch in our case)
    this.view.dispatch(tr);
    
    // === RE-SEARCH AFTER REPLACE ===
    // Need to re-find matches because positions have changed
    if (this.searchTerm) {
      setTimeout(() => {
        this.findAll(this.searchTerm, this.matchCase);
      }, 100); // Small delay for DOM to update
    }
    
    return true;
  }
  
  /**
   * Replace all matches
   * 
   * Creates a single transaction with multiple insertText operations.
   * Works backwards through matches to avoid position shifting issues.
   * 
   * Why backwards? If we replace from start to end, each replacement shifts
   * the positions of later matches. Working backwards keeps positions valid.
   * 
   * @param {string} replaceText - Text to replace with
   * @returns {number} Number of replacements made
   */
  replaceAll(replaceText) {
    if (this.currentMatches.length === 0) {
      return 0;
    }
    
    const count = this.currentMatches.length;
    
    // === CREATE SINGLE TRANSACTION FOR ALL REPLACEMENTS ===
    // More efficient than multiple transactions
    let tr = this.view.state.tr;
    
    // === REPLACE BACKWARDS TO PRESERVE POSITIONS ===
    // Example: Matches at positions [10, 20, 30]
    // If we replace at 10 first, positions 20 and 30 shift
    // If we replace at 30 first, positions 10 and 20 stay valid
    for (let i = this.currentMatches.length - 1; i >= 0; i--) {
      const match = this.currentMatches[i];
      tr = tr.insertText(replaceText, match.from, match.to);
    }
    
    // === DISPATCH TRANSACTION ===
    this.view.dispatch(tr);
    
    // === CLEAR AFTER REPLACE ALL ===
    this.clear();
    
    return count;
  }
  
  /* ========================================
   * HIGHLIGHTING METHODS
   * ======================================== */
  
  /**
   * Highlight all matches in the editor
   * 
   * Uses native Selection API for mock EditorView (Foundry v13),
   * falls back to ProseMirror selection for real EditorView.
   * 
   * @private
   */
  highlightMatches() {
    // Always use native DOM selection so the highlight is visible regardless of
    // whether the editor has focus (it typically doesn't — the find input does).
    // view.domAtPos() is the real EditorView equivalent of the mock's _viewDesc.domFromPos().
    this._applyHighlightDecorations();
  }
  
  _applyHighlightDecorations() {
    // Use the CSS Custom Highlight API — available in all modern Chromium builds
    // (Electron included). Applies visual overlays without touching the DOM or
    // ProseMirror state, so nothing fights us for control.
    if (typeof CSS === 'undefined' || !CSS.highlights) {
      // Fallback to old native selection path for environments without support.
      this._highlightWithNativeSelection();
      return;
    }

    const domFromPos = (pos) => {
      if (typeof this.view.domAtPos === 'function') return this.view.domAtPos(pos);
      return this.view._viewDesc?.domFromPos(pos);
    };

    const allRanges = [];
    let currentRange = null;

    for (let i = 0; i < this.currentMatches.length; i++) {
      const match = this.currentMatches[i];
      try {
        const startPos = domFromPos(match.from);
        const endPos = domFromPos(match.to);
        if (!startPos || !endPos) continue;

        const r = new StaticRange({
          startContainer: startPos.node,
          startOffset: startPos.offset,
          endContainer: endPos.node,
          endOffset: endPos.offset
        });

        if (i === this.currentMatchIndex) {
          currentRange = r;
        } else {
          allRanges.push(r);
        }
      } catch (e) {
        // ignore individual failures
      }
    }

    // Pale yellow for all non-current matches
    CSS.highlights.set('find-replace-all', new Highlight(...allRanges));
    // Light green for the current match
    if (currentRange) {
      CSS.highlights.set('find-replace-current', new Highlight(currentRange));
    } else {
      CSS.highlights.delete('find-replace-current');
    }
  }

  /**
   * Highlight using native browser Selection API (fallback)
   * Used when CSS Custom Highlight API is not available.
   * @private
   */
  _highlightWithNativeSelection() {
    if (this.currentMatchIndex < 0 || this.currentMatchIndex >= this.currentMatches.length) return;
    
    const match = this.currentMatches[this.currentMatchIndex]; // {from, to} in PM positions
    
    try {
      // === CONVERT PM POSITIONS TO DOM POSITIONS ===
      // Real EditorView exposes view.domAtPos(pos) -> {node, offset}.
      // Mock EditorView used view._viewDesc.domFromPos(pos) -> {node, offset}.
      // Both return the same shape; prefer the real API.
      const domFromPos = (pos) => {
        if (typeof this.view.domAtPos === 'function') return this.view.domAtPos(pos);
        return this.view._viewDesc?.domFromPos(pos);
      };
      
      const startPos = domFromPos(match.from);
      const endPos = domFromPos(match.to);
      
      if (startPos && endPos) {
        // === CREATE RANGE ===
        const range = document.createRange();
        range.setStart(startPos.node, startPos.offset);
        range.setEnd(endPos.node, endPos.offset);
        
        // === APPLY TO SELECTION ===
        const selection = window.getSelection();
        selection.removeAllRanges();  // Clear existing selection
        selection.addRange(range);    // Apply new range (creates highlight)
        
        // === SCROLL INTO VIEW ===
        range.startContainer.parentElement?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      } else {
        console.warn('FindReplaceLogic | Could not convert PM positions to DOM positions');
      }
    } catch (e) {
      console.error('FindReplaceLogic | Error highlighting with native selection:', e);
    }
  }
  
  /* ========================================
   * UTILITY METHODS
   * ======================================== */
  
  /**
   * Scroll to a specific match
   * 
   * For mock EditorView, the native selection highlighting automatically
   * scrolls the element into view. This method ensures it's centered.
   * 
   * @param {number} index - Index of match to scroll to
   * @private
   */
  scrollToMatch(index) {
    if (index < 0 || index >= this.currentMatches.length) return;

    const domFromPos = (pos) => {
      if (typeof this.view.domAtPos === 'function') return this.view.domAtPos(pos);
      return this.view._viewDesc?.domFromPos(pos);
    };

    try {
      const match = this.currentMatches[index];
      const startPos = domFromPos(match.from);
      if (startPos?.node) {
        const el = startPos.node.nodeType === Node.TEXT_NODE
          ? startPos.node.parentElement
          : startPos.node;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (e) {
      // ignore
    }
  }
  
  /**
   * Clear all search state and highlighting
   */
  clear() {
    this.currentMatches = [];
    this.currentMatchIndex = -1;
    this.searchTerm = '';
    
    // Clear CSS Custom Highlight decorations
    if (typeof CSS !== 'undefined' && CSS.highlights) {
      CSS.highlights.delete('find-replace-all');
      CSS.highlights.delete('find-replace-current');
    }

    // Also clear native selection as fallback cleanup
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }
}
