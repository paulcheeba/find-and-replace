/**
 * main.js
 * Version: 13.0.1.0
 * Last Updated: 2025-11-16
 * Changes: Added comprehensive code comments for better maintainability
 * 
 * Find and Replace Module for Foundry VTT
 * Entry point for the module. Handles editor detection via MutationObserver,
 * creates mock EditorView for Foundry v13's custom <prose-mirror> elements,
 * manages controller registry for button persistence across element replacements.
 * 
 * @module find-and-replace
 * @author paulcheeba (crusherDestroyer666)
 */

import { ProseMirrorIntegration } from './prosemirror-integration.js';
import { UIController } from './ui-controller.js';

/* ========================================
 * GLOBAL STATE
 * ======================================== */

/**
 * Module namespace
 */
const MODULE_ID = 'find-and-replace';

/**
 * Track UIControllers by a stable ID to survive element replacements
 * Key: Stable form element ID (persists across prose-mirror element replacements)
 * Value: UIController instance (preserves UI state and button reference)
 * 
 * Why needed: Foundry v13 replaces the entire <prose-mirror> element when user
 * types or clicks, which removes our button. We use the parent form's ID as a
 * stable key to retrieve and reuse the same controller instance.
 */
const controllerRegistry = new Map();

/* ========================================
 * FOUNDRY VTT HOOKS
 * ======================================== */

/**
 * Initialize the module
 * Called when Foundry first initializes, before data is ready.
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

/* ========================================
 * EDITOR DETECTION - MUTATION OBSERVER
 * ======================================== */

/**
 * Set up a MutationObserver to watch for prose-mirror custom elements
 * 
 * Why MutationObserver instead of Hooks:
 * Foundry v13's custom <prose-mirror> elements don't trigger standard
 * renderApplication hooks reliably. MutationObserver watches the entire
 * document for new prose-mirror elements being added to the DOM.
 * 
 * Also handles button re-injection:
 * When Foundry replaces the prose-mirror element (on user interaction),
 * the mutation handler detects the button is missing and re-injects it
 * after a 150ms debounce delay to prevent infinite loops.
 */
function setupProseMirrorObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // HANDLER 1: Detect mutations ON prose-mirror elements (element replacement)
      // When Foundry replaces the prose-mirror element, the mutation.target IS the prose-mirror
      if (mutation.target && mutation.target.tagName === 'PROSE-MIRROR') {
        // Check if our button was removed by the mutation
        const menu = mutation.target.querySelector('menu.editor-menu');
        const button = menu?.querySelector('.find-replace-button');
        
        if (!button && menu) {
          // DEBOUNCE: Wait 150ms before re-injecting to prevent infinite loop
          // Why: Button injection triggers a mutation, which would immediately
          // trigger this handler again without the delay
          setTimeout(() => {
            // Double-check button is still missing after delay
            const stillMissing = !menu.querySelector('.find-replace-button');
            if (stillMissing) {
              console.log(`${MODULE_ID} | Button confirmed missing after delay - re-injecting`);
              // Reset processed marker to allow re-processing
              mutation.target.dataset.findReplaceProcessed = 'false';
              handleProseMirrorElement(mutation.target);
            }
          }, 150); // 150ms debounce
        }
      }
      
      // HANDLER 2: Detect NEW prose-mirror elements added to DOM
      // Fires when journals, actor sheets, etc. are opened and editors are created
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Direct prose-mirror element added
          if (node.tagName === 'PROSE-MIRROR') {
            console.log(`${MODULE_ID} | Detected new prose-mirror element being added`);
            handleProseMirrorElement(node);
          } else {
            // Search for prose-mirror elements inside added containers
            // (e.g., when a journal window is added with editors inside)
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

/* ========================================
 * PROSE-MIRROR ELEMENT HANDLER
 * ======================================== */

/**
 * Handle a prose-mirror custom element
 * 
 * This function is called for:
 * 1. Initial detection when editor opens
 * 2. Re-injection when element is replaced by Foundry
 * 
 * Creates mock EditorView if real one not accessible,
 * manages controller registry, and injects button.
 * 
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
    
    // === STABLE ID GENERATION ===
    // Find parent form element (persists across prose-mirror replacements)
    // Format: "JournalEntryPageProseMirrorSheet-JournalEntry-<id>-JournalEntryPage-<id>"
    const formElement = proseMirrorElement.closest('form');
    const stableId = formElement?.id || `prosemirror-${Date.now()}`;
    
    // === CONTROLLER REGISTRY CHECK ===
    // Check if we've already processed this editor (by stable form ID)
    const existingController = controllerRegistry.get(stableId);
    const existingButton = menu.querySelector('.find-replace-button');
    
    console.log(`${MODULE_ID} | Checking state - Controller exists: ${!!existingController}, Button exists: ${!!existingButton}, Stable ID: ${stableId}`);
    
    // If both controller and button exist, nothing to do
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
    
    // === EDITORVIEW DETECTION ===
    // Try to find real EditorView (usually not accessible in Foundry v13)
    const editorView = getEditorViewFromElement(editorContent);
    
    if (!editorView) {
      // === MOCK EDITORVIEW CREATION ===
      // Foundry v13's custom element doesn't expose EditorView directly
      // Create mock EditorView that mimics the ProseMirror EditorView API
      if (editorContent.pmViewDesc && editorContent.pmViewDesc.node) {
        const viewDesc = editorContent.pmViewDesc; // Contains ProseMirror document and schema
        
        // Mock EditorView structure that our find/replace logic expects
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
          // Mock dispatch function - applies ProseMirror transactions to the editor
          // This is called by our replace logic to update the editor content
          dispatch: (tr) => {
            console.log(`${MODULE_ID} | Mock dispatch called with transaction`, tr);
            
            // Only process transactions that actually modify content (have steps)
            if (tr && tr.steps && tr.steps.length > 0) {
              const newDoc = tr.doc; // Get modified document from transaction
              if (newDoc) {
                try {
                  // === SERIALIZE PROSEMIRROR DOC TO HTML ===
                  // ProseMirror stores content as a document tree, need to convert to HTML
                  const serializer = window.ProseMirror.DOMSerializer.fromSchema(newDoc.type.schema);
                  const fragment = serializer.serializeFragment(newDoc.content);
                  
                  // Create temporary container to hold serialized HTML
                  const temp = document.createElement('div');
                  temp.appendChild(fragment);
                  
                  // === UPDATE FOUNDRY'S INTERNAL STATE ===
                  // Update the prose-mirror element's internal value
                  proseMirrorElement._value = temp.innerHTML;
                  
                  // Update the visible DOM content
                  editorContent.innerHTML = temp.innerHTML;
                  
                  // Update mock state to reflect changes
                  mockEditorView.state.doc = newDoc;
                  
                  // === TRIGGER FOUNDRY CHANGE DETECTION ===
                  // Fire 'input' event so Foundry knows content changed and enables Save button
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
        

        
        // === CONTROLLER REGISTRY: CREATE OR REUSE ===
        let uiController = controllerRegistry.get(stableId);
        
        if (!uiController) {
          // === FIRST TIME: CREATE NEW CONTROLLER ===
          // This editor hasn't been seen before, create fresh controller
          try {
            uiController = new UIController(mockEditorView, menu);
            uiController.injectButton();
            // Store in registry so we can reuse it if element gets replaced
            controllerRegistry.set(stableId, uiController);
            console.log(`${MODULE_ID} | SUCCESS! New UIController created and button injected (ID: ${stableId})`);
          } catch (error) {
            console.error(`${MODULE_ID} | Failed to inject button:`, error);
            proseMirrorElement.dataset.findReplaceProcessed = 'false'; // Allow retry on error
          }
        } else {
          // === ELEMENT REPLACED: REUSE EXISTING CONTROLLER ===
          // Foundry replaced the prose-mirror element, but we have the controller saved
          // Update controller's view reference and re-inject button
          console.log(`${MODULE_ID} | Reusing existing UIController (ID: ${stableId}), updating view`);
          
          // Update view references (new mock EditorView for new element)
          uiController.view = mockEditorView;
          uiController.logic.view = mockEditorView;
          uiController.toolbarElement = menu;
          
          // Re-inject button if it's missing (it was on the old element that got replaced)
          if (!menu.querySelector('.find-replace-button')) {
            console.log(`${MODULE_ID} | Button missing, re-injecting`);
            const wasExpanded = uiController.isExpanded; // Preserve UI state
            uiController.injectButton();
            
            // Restore active state (orange glow) if UI was expanded before replacement
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

/* ========================================
 * EDITORVIEW FINDER (FALLBACK)
 * ======================================== */

/**
 * Attempt to find the real ProseMirror EditorView instance from a DOM element
 * 
 * This tries multiple property names where Foundry might store the EditorView.
 * In practice, this usually returns null for Foundry v13's custom elements,
 * and we fall back to creating a mock EditorView instead.
 * 
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

/* ========================================
 * MODULE EXPORTS
 * ======================================== */

// Export module API for debugging and external access
// Can be accessed via console: window.FindAndReplace
window.FindAndReplace = {
  MODULE_ID,
  controllerRegistry, // For debugging: see all active controllers
  // TODO: Export additional API methods if needed
};
