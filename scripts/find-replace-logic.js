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
export class FindReplaceLogic {
  
  constructor(editorView) {
    this.view = editorView;
    this.currentMatches = [];
    this.currentMatchIndex = -1;
    this.searchTerm = '';
    this.matchCase = false;
  }
  
  /**
   * Find all matches of a search term in the document
   * @param {string} searchTerm - Text to search for
   * @param {boolean} matchCase - Whether to match case
   * @returns {Array} Array of match positions
   */
  findAll(searchTerm, matchCase = false) {
    console.log('FindReplaceLogic | Finding all matches for:', searchTerm);
    
    this.searchTerm = searchTerm;
    this.matchCase = matchCase;
    this.currentMatches = [];
    this.currentMatchIndex = -1;
    
    if (!searchTerm) {
      this.clear();
      return [];
    }
    
    const state = this.view.state;
    const doc = state.doc;
    
    // Search through the document
    const searchStr = matchCase ? searchTerm : searchTerm.toLowerCase();
    
    // Traverse all text content in the document
    doc.descendants((node, pos) => {
      if (node.isText) {
        const text = matchCase ? node.text : node.text.toLowerCase();
        let index = 0;
        
        // Find all occurrences in this text node
        while ((index = text.indexOf(searchStr, index)) !== -1) {
          const from = pos + index;
          const to = from + searchTerm.length;
          
          this.currentMatches.push({from, to});
          
          index += searchTerm.length; // Move past this match
        }
      }
    });
    
    console.log(`FindReplaceLogic | Found ${this.currentMatches.length} matches`);
    
    // If we have matches, select the first one
    if (this.currentMatches.length > 0) {
      this.currentMatchIndex = 0;
      this.highlightMatches();
      this.scrollToMatch(0);
    }
    
    return this.currentMatches;
  }
  
  /**
   * Navigate to the next match
   */
  findNext() {
    if (this.currentMatches.length === 0) return;
    
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.currentMatches.length;
    this.highlightMatches();
    this.scrollToMatch(this.currentMatchIndex);
  }
  
  /**
   * Navigate to the previous match
   */
  findPrevious() {
    if (this.currentMatches.length === 0) return;
    
    this.currentMatchIndex = this.currentMatchIndex - 1;
    if (this.currentMatchIndex < 0) {
      this.currentMatchIndex = this.currentMatches.length - 1;
    }
    
    this.highlightMatches();
    this.scrollToMatch(this.currentMatchIndex);
  }
  
  /**
   * Replace the current match
   * @param {string} replaceText - Text to replace with
   * @returns {boolean} Whether replacement was successful
   */
  replaceCurrent(replaceText) {
    if (this.currentMatches.length === 0 || this.currentMatchIndex < 0) {
      return false;
    }
    
    const match = this.currentMatches[this.currentMatchIndex];
    
    const tr = this.view.state.tr;
    if (!tr) {
      console.error('FindReplaceLogic | Failed to create transaction');
      return false;
    }
    
    // Replace the text at the match position
    tr.insertText(replaceText, match.from, match.to);
    
    // Dispatch the transaction
    this.view.dispatch(tr);
    
    // Find new matches after replace
    if (this.searchTerm) {
      setTimeout(() => {
        this.findAll(this.searchTerm, this.matchCase);
      }, 100);
    }
    
    return true;
  }
  
  /**
   * Replace all matches
   * @param {string} replaceText - Text to replace with
   * @returns {number} Number of replacements made
   */
  replaceAll(replaceText) {
    if (this.currentMatches.length === 0) {
      return 0;
    }
    
    const count = this.currentMatches.length;
    
    // Create a single transaction for all replacements
    // Work backwards to avoid position shifting issues
    let tr = this.view.state.tr;
    
    for (let i = this.currentMatches.length - 1; i >= 0; i--) {
      const match = this.currentMatches[i];
      tr = tr.insertText(replaceText, match.from, match.to);
    }
    
    // Dispatch the transaction
    this.view.dispatch(tr);
    
    // Clear matches after replace all
    this.clear();
    
    return count;
  }
  
  /**
   * Highlight all matches in the editor
   * @private
   */
  highlightMatches() {
    // If using a mock EditorView, use native browser selection
    if (this.view._isMock) {
      this._highlightWithNativeSelection();
      return;
    }
    
    // For real EditorView, use ProseMirror selection
    if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.currentMatches.length) {
      const match = this.currentMatches[this.currentMatchIndex];
      const tr = this.view.state.tr;
      
      // Set selection to the current match
      tr.setSelection(
        this.view.state.selection.constructor.create(
          this.view.state.doc,
          match.from,
          match.to
        )
      );
      
      this.view.dispatch(tr);
    }
  }
  
  /**
   * Highlight using native browser Selection API (for mock EditorView)
   * @private
   */
  _highlightWithNativeSelection() {
    if (this.currentMatchIndex < 0 || this.currentMatchIndex >= this.currentMatches.length) return;
    
    const match = this.currentMatches[this.currentMatchIndex];
    const editorDOM = this.view.dom;
    const viewDesc = this.view._viewDesc;
    
    try {
      // Use ProseMirror's domFromPos to convert PM positions to DOM positions
      const startPos = viewDesc.domFromPos(match.from);
      const endPos = viewDesc.domFromPos(match.to);
      
      if (startPos && endPos) {
        const range = document.createRange();
        range.setStart(startPos.node, startPos.offset);
        range.setEnd(endPos.node, endPos.offset);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Scroll into view
        range.startContainer.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        console.warn('FindReplaceLogic | Could not convert PM positions to DOM positions');
      }
    } catch (e) {
      console.error('FindReplaceLogic | Error highlighting with native selection:', e);
    }
  }
  
  /**
   * Scroll to a specific match
   * @param {number} index - Index of match to scroll to
   * @private
   */
  scrollToMatch(index) {
    if (index < 0 || index >= this.currentMatches.length) return;
    
    // If using mock, just use the current selection scroll
    if (this.view._isMock) {
      // The native selection highlight will handle scrolling
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect) {
          // Scroll into view if needed
          if (rect.top < 0 || rect.bottom > window.innerHeight) {
            range.startContainer.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
      return;
    }
    
    const match = this.currentMatches[index];
    
    // Scroll the match into view
    const tr = this.view.state.tr;
    tr.scrollIntoView();
    this.view.dispatch(tr);
  }
  
  /**
   * Clear all search state and highlighting
   */
  clear() {
    this.currentMatches = [];
    this.currentMatchIndex = -1;
    this.searchTerm = '';
    
    // Clear native selection to remove highlighting
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }
}
