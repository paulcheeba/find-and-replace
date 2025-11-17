/**
 * ProseMirror Integration Module
 * 
 * Handles the integration with ProseMirror editors:
 * - Editor state management
 * - Transaction handling
 * - Editor detection across different Foundry contexts
 * 
 * Note: This module provides helper functions for working with ProseMirror.
 * The actual editor view instances are accessed directly from the DOM in main.js.
 * 
 * @module prosemirror-integration
 */

/**
 * Class responsible for integrating with ProseMirror editors
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
