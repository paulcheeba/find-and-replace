/**
 * prosemirror-integration.js
 * Version: 13.0.1.0
 * Last Updated: 2025-11-16
 * Changes: Added comprehensive code comments for better maintainability
 * 
 * ProseMirror Integration Module
 * Provides helper functions for working with ProseMirror editors.
 * 
 * NOTE: This file is currently minimal because we use a mock EditorView
 * approach in main.js for Foundry v13's custom <prose-mirror> elements.
 * These utilities work with both real and mock EditorViews.
 * 
 * @module prosemirror-integration
 */

/* ========================================
 * PROSEMIRROR INTEGRATION HELPERS
 * ======================================== */

/**
 * Class responsible for integrating with ProseMirror editors
 * 
 * Provides static utility methods that work with EditorView instances.
 * All methods are safe to use with mock EditorView (they just delegate
 * to the view's properties/methods which we implement in the mock).
 */
export class ProseMirrorIntegration {
  
  /**
   * Get the current editor state
   * @param {EditorView} view - ProseMirror editor view
   * @returns {EditorState} Current editor state
   */
  static getEditorState(view) {
    return view.state;
  }
  
  /**
   * Apply a transaction to the editor
   * @param {EditorView} view - ProseMirror editor view
   * @param {Transaction} transaction - Transaction to apply
   */
  static applyTransaction(view, transaction) {
    try {
      view.dispatch(transaction);
    } catch (error) {
      console.error('ProseMirrorIntegration | Error applying transaction:', error);
    }
  }
  
  /**
   * Create a transaction for the given view
   * @param {EditorView} view - ProseMirror editor view
   * @returns {Transaction} New transaction
   */
  static createTransaction(view) {
    return view.state.tr;
  }
  
  /**
   * Get the document from an editor view
   * @param {EditorView} view - ProseMirror editor view
   * @returns {Node} ProseMirror document node
   */
  static getDocument(view) {
    return view.state.doc;
  }
  
  /**
   * Get the current selection from an editor view
   * @param {EditorView} view - ProseMirror editor view
   * @returns {Selection} Current selection
   */
  static getSelection(view) {
    return view.state.selection;
  }
}
