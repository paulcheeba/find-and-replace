/**
 * Find and Replace Module for Foundry VTT
 * 
 * Main entry point for the module. This file handles:
 * - Module initialization
 * - Hook registration
 * - ProseMirror editor detection and integration
 * 
 * @module find-and-replace
 * @author paulcheeba (crusherDestroyer666)
 * @version 13.0.0.0
 */

import { ProseMirrorIntegration } from './prosemirror-integration.js';
import { UIController } from './ui-controller.js';

/**
 * Module namespace
 */
const MODULE_ID = 'find-and-replace';

/**
 * Track UIControllers by a stable ID to survive element replacements
 * Key: window ID + form ID from the parent form element
 */
const controllerRegistry = new Map();

/**
 * Initialize the module
 */
Hooks.once('init', function() {
  console.log(`${MODULE_ID} | Initializing Find and Replace module`);
  
  // No settings needed for now - keep it simple
});

/**
 * Setup module after Foundry is ready
 */
Hooks.once('ready', function() {
  console.log(`${MODULE_ID} | Find and Replace module ready`);
  console.log(`${MODULE_ID} | Foundry VTT version: ${game.version}`);
  console.log(`${MODULE_ID} | Setting up ProseMirror editor observer...`);
  
  // Set up mutation observer to watch for prose-mirror elements
  setupProseMirrorObserver();
});

/**
 * Set up a MutationObserver to watch for prose-mirror custom elements
 * This is necessary because Foundry v13 uses custom elements that don't trigger
 * the standard renderApplication hooks.
 */
function setupProseMirrorObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Log if any mutations are happening to prose-mirror elements
      if (mutation.target && mutation.target.tagName === 'PROSE-MIRROR') {
        // Check if the button still exists after the mutation
        const menu = mutation.target.querySelector('menu.editor-menu');
        const button = menu?.querySelector('.find-replace-button');
        
        if (!button && menu) {
          // Use a small delay to prevent infinite loops from immediate re-injection
          setTimeout(() => {
            // Double-check button is still missing after delay
            const stillMissing = !menu.querySelector('.find-replace-button');
            if (stillMissing) {
              console.log(`${MODULE_ID} | Button confirmed missing after delay - re-injecting`);
              mutation.target.dataset.findReplaceProcessed = 'false';
              handleProseMirrorElement(mutation.target);
            }
          }, 150);
        }
      }
      
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node is a prose-mirror element
          if (node.tagName === 'PROSE-MIRROR') {
            console.log(`${MODULE_ID} | Detected new prose-mirror element being added`);
            handleProseMirrorElement(node);
          } else {
            // Only check children if the node itself is NOT a prose-mirror element
            // This prevents double-processing
            const proseMirrorElements = node.querySelectorAll?.('prose-mirror');
            if (proseMirrorElements?.length > 0) {
              console.log(`${MODULE_ID} | Found ${proseMirrorElements.length} prose-mirror element(s) in added content`);
              proseMirrorElements.forEach(handleProseMirrorElement);
            }
          }
        }
      });
    });
  });
  
  // Start observing the document body for added nodes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log(`${MODULE_ID} | MutationObserver active, watching for prose-mirror elements`);
  
  // Also process any existing prose-mirror elements that are already in the DOM
  const existingEditors = document.querySelectorAll('prose-mirror');
  if (existingEditors.length > 0) {
    console.log(`${MODULE_ID} | Processing ${existingEditors.length} existing prose-mirror element(s)`);
    existingEditors.forEach(handleProseMirrorElement);
  }
}

/**
 * Handle a prose-mirror custom element
 * @param {HTMLElement} proseMirrorElement - The prose-mirror custom element
 */
function handleProseMirrorElement(proseMirrorElement) {
  // Check if already processed using a unique marker
  if (proseMirrorElement.dataset.findReplaceProcessed === 'true') {
    return; // Already processed, skip
  }
  
  // Mark as being processed immediately to prevent duplicate processing
  proseMirrorElement.dataset.findReplaceProcessed = 'true';
  
  // Wait a bit for the element to be fully initialized
  setTimeout(() => {
      // Find the menu toolbar - it's a direct child of prose-mirror
      const menu = proseMirrorElement.querySelector('menu.editor-menu');
      if (!menu) {
        console.warn(`${MODULE_ID} | Could not find menu in prose-mirror element`, proseMirrorElement);
        proseMirrorElement.dataset.findReplaceProcessed = 'false'; // Allow retry
        return;
      }
    
    // Create a stable ID from the parent form element (which doesn't get replaced)
    const formElement = proseMirrorElement.closest('form');
    const stableId = formElement?.id || `prosemirror-${Date.now()}`;
    
    // Check if we already have a controller for this editor
    const existingController = controllerRegistry.get(stableId);
    const existingButton = menu.querySelector('.find-replace-button');
    
    console.log(`${MODULE_ID} | Checking state - Controller exists: ${!!existingController}, Button exists: ${!!existingButton}, Stable ID: ${stableId}`);
    
    if (existingButton && existingController) {
      console.log(`${MODULE_ID} | Button and controller both exist, skipping`);
      return;
    }
    
    // Find the ProseMirror editor div
    const editorContent = proseMirrorElement.querySelector('.editor-content.ProseMirror');
    if (!editorContent) {
      console.warn(`${MODULE_ID} | Could not find .editor-content.ProseMirror in prose-mirror element`, proseMirrorElement);
      return;
    }
    
    // Try to get the EditorView instance
    const editorView = getEditorViewFromElement(editorContent);
    
    if (!editorView) {
      // Create mock EditorView from ProseMirror state
      if (editorContent.pmViewDesc && editorContent.pmViewDesc.node) {
        const viewDesc = editorContent.pmViewDesc;
        
        // Create a mock EditorView-like object with what we have
        // We'll create a working dispatch function that modifies the prose-mirror element
        const mockEditorView = {
          dom: editorContent,
          state: {
            doc: viewDesc.node,
            selection: {
              from: 0,
              to: 0,
              anchor: 0,
              head: 0
            },
            // Add tr getter to create proper ProseMirror transactions
            get tr() {
              // Create a proper EditorState first, then get its transaction
              if (!window.ProseMirror.state || !window.ProseMirror.state.EditorState) {
                console.error('ProseMirror EditorState not available');
                return null;
              }
              // Create a minimal EditorState with the current doc
              const state = window.ProseMirror.state.EditorState.create({
                doc: this.doc,
                schema: this.doc.type.schema
              });
              return state.tr;
            }
          },
          // Create a dispatch function that updates the prose-mirror element's value
          dispatch: (tr) => {
            console.log(`${MODULE_ID} | Mock dispatch called with transaction`, tr);
            
            // For transactions with steps (actual modifications), update the content
            if (tr && tr.steps && tr.steps.length > 0) {
              // Get the modified document from the transaction
              const newDoc = tr.doc;
              if (newDoc) {
                try {
                  // Serialize the document to HTML
                  const serializer = window.ProseMirror.DOMSerializer.fromSchema(newDoc.type.schema);
                  const fragment = serializer.serializeFragment(newDoc.content);
                  
                  // Create a temporary container
                  const temp = document.createElement('div');
                  temp.appendChild(fragment);
                  
                  // Update the prose-mirror element's value
                  proseMirrorElement._value = temp.innerHTML;
                  
                  // Update the DOM
                  editorContent.innerHTML = temp.innerHTML;
                  
                  // Update the mock state
                  mockEditorView.state.doc = newDoc;
                  
                  // Trigger Foundry's change detection by dispatching an input event
                  const event = new Event('input', { bubbles: true, cancelable: true });
                  editorContent.dispatchEvent(event);
                  
                  console.log(`${MODULE_ID} | Updated editor content via mock dispatch`);
                } catch (e) {
                  console.error(`${MODULE_ID} | Error in mock dispatch:`, e);
                }
              }
            }
            
            // For selection-only transactions, just update the selection
            if (tr && tr.selectionSet) {
              mockEditorView.state.selection = tr.selection;
            }
          },
          _isMock: true,
          _proseMirrorElement: proseMirrorElement,
          _viewDesc: viewDesc
        };
        
        // Store viewDesc reference for highlighting
        mockEditorView._viewDesc = viewDesc;
        

        
        // Check if we already have a controller for this editor
        let uiController = controllerRegistry.get(stableId);
        
        if (!uiController) {
          // Create new controller
          try {
            uiController = new UIController(mockEditorView, menu);
            uiController.injectButton();
            // Store controller in registry using stable ID
            controllerRegistry.set(stableId, uiController);
            console.log(`${MODULE_ID} | SUCCESS! New UIController created and button injected (ID: ${stableId})`);
          } catch (error) {
            console.error(`${MODULE_ID} | Failed to inject button:`, error);
            proseMirrorElement.dataset.findReplaceProcessed = 'false'; // Allow retry on error
          }
        } else {
          // Update existing controller with new mock view and re-inject button
          console.log(`${MODULE_ID} | Reusing existing UIController (ID: ${stableId}), updating view`);
          uiController.view = mockEditorView;
          uiController.logic.view = mockEditorView;
          uiController.toolbarElement = menu;
          
          // Re-inject button if it doesn't exist
          if (!menu.querySelector('.find-replace-button')) {
            console.log(`${MODULE_ID} | Button missing, re-injecting`);
            const wasExpanded = uiController.isExpanded;
            uiController.injectButton();
            // Restore active state if UI was expanded
            if (wasExpanded && uiController.button) {
              uiController.button.classList.add('active');
            }
          } else {
            console.log(`${MODULE_ID} | Button still present, no re-injection needed`);
          }
        }
      }
      
      return;
    }
    
    console.log(`${MODULE_ID} | Successfully found EditorView, injecting find/replace button`);
    
    // Create UI controller and inject button
    const uiController = new UIController(editorView, menu);
    uiController.injectButton();
  }, 100); // Give the custom element time to initialize
}

/**
 * Attempt to find the ProseMirror EditorView instance from a DOM element
 * @param {HTMLElement} element - The ProseMirror editor element
 * @returns {EditorView|null} The EditorView instance or null
 */
function getEditorViewFromElement(element) {
  // Try the prose-mirror parent element first
  const proseMirrorElement = element.closest('prose-mirror');
  
  if (proseMirrorElement) {
    // In Foundry v13, the _primaryInput contains the actual ProseMirror editor DOM
    // and that's where the pmViewDesc lives, which we can use to access the view
    if (proseMirrorElement._primaryInput?.pmViewDesc) {
      const viewDesc = proseMirrorElement._primaryInput.pmViewDesc;
      // Try to find the EditorView by traversing up the ViewDesc chain
      let current = viewDesc;
      while (current) {
        if (current.view) {
          console.log(`${MODULE_ID} | Found EditorView via _primaryInput.pmViewDesc chain`);
          return current.view;
        }
        current = current.parent;
      }
    }
    
    // Try common private property names where Foundry might store the view
    const possibleProps = ['_view', '_editorView', '_prosemirror', 'editorView', '__view'];
    for (const prop of possibleProps) {
      if (proseMirrorElement[prop]) {
        console.log(`${MODULE_ID} | Found EditorView via proseMirrorElement.${prop}`);
        return proseMirrorElement[prop];
      }
    }
  }
  
  // The EditorView might be stored in the pmViewDesc's parent or a sibling property
  if (element.pmViewDesc) {
    const viewDesc = element.pmViewDesc;
    
    // Try to traverse up the ViewDesc tree to find the root EditorView
    let current = viewDesc;
    while (current) {
      if (current.view) {
        console.log(`${MODULE_ID} | Found EditorView via ViewDesc chain`);
        return current.view;
      }
      current = current.parent;
    }
    
    // The ViewDesc.dom is the actual DOM element, and ProseMirror stores
    // a back-reference on the DOM element itself
    if (viewDesc.dom) {
      // Check for ProseMirror's internal property on the DOM
      const domKeys = Object.keys(viewDesc.dom);
      console.log(`${MODULE_ID} | Checking ViewDesc.dom for hidden properties:`, domKeys);
      
      // Look for any property that might be the EditorView
      for (const key of domKeys) {
        const value = viewDesc.dom[key];
        if (value && typeof value === 'object' && value.state && value.dispatch) {
          console.log(`${MODULE_ID} | Found EditorView-like object via viewDesc.dom.${key}`);
          return value;
        }
      }
    }
  }
  
  // Check common property names on the element itself
  if (element.pmView) {
    console.log(`${MODULE_ID} | Found EditorView via element.pmView`);
    return element.pmView;
  }
  if (element.view) {
    console.log(`${MODULE_ID} | Found EditorView via element.view`);
    return element.view;
  }
  
  return null;
}

// Export module API for debugging and external access
window.FindAndReplace = {
  MODULE_ID,
  // TODO: Export additional API methods
};
