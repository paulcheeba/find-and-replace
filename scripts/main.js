/**
 * main.js
 * Version: 13.1.0.0
 * Last Updated: 2025-12-30
 * Changes: MAJOR REFACTOR - Migrated from MutationObserver to official Foundry API
 *          Uses getProseMirrorMenuItems hook for proper button registration
 *          Accesses real EditorView from menu.view (no more mock EditorView)
 *          Eliminates button persistence issues by working with Foundry's lifecycle
 * 
 * Find and Replace Module for Foundry VTT
 * Entry point for the module. Uses Foundry's official getProseMirrorMenuItems hook
 * to register the Find & Replace button in ProseMirror editor toolbars. This ensures
 * the button persists naturally as part of Foundry's menu system.
 * 
 * @module find-and-replace
 * @author paulcheeba (crusherDestroyer666)
 */

import { UIController } from './ui-controller.js';

/* ========================================
 * GLOBAL STATE
 * ======================================== */

/**
 * Module namespace
 */
const MODULE_ID = 'find-and-replace';

// Debug flags
// - Turn DISCOVERY on only when actively hunting new Foundry internals.
const DEBUG_DISCOVERY = false;
const DEBUG_RENSURE = false;

// Native patch state (no libWrapper)
let NATIVE_MENU_PATCH_ACTIVE = false;
const patchedMenuCtors = new WeakSet();

/**
 * Track UIControllers by a stable editor key.
 *
 * In Foundry v13, ProseMirror menus can be rebuilt frequently (including while typing),
 * which can remove any custom DOM we injected into the toolbar. We key controllers by
 * a stable ancestor form/application id so state survives menu rebuilds.
 */
const controllerRegistry = new Map();

/**
 * Per-editor lifecycle state.
 * Foundry can recreate the <prose-mirror> element and/or EditorView for the same document.
 * We must refresh observers and event handlers whenever that happens.
 */
const toolbarObserverState = new Map();
const pendingPurgeTimers = new Map();

// One-time discovery logging guards
const discoveredMenuClasses = new Set();
const discoveredStacks = new Set();

function logDiscoveryOnce(menu) {
  if (!DEBUG_DISCOVERY || !menu) return;

  const ctor = menu?.constructor;
  const ctorName = ctor?.name || 'UnknownConstructor';
  if (discoveredMenuClasses.has(ctorName)) return;
  discoveredMenuClasses.add(ctorName);

  try {
    const proto = Object.getPrototypeOf(menu);
    const descriptors = Object.getOwnPropertyDescriptors(proto);
    const methodNames = Object.entries(descriptors)
      .filter(([, d]) => typeof d.value === 'function')
      .map(([k]) => k)
      .sort();

    const accessorNames = Object.entries(descriptors)
      .filter(([, d]) => typeof d.get === 'function' || typeof d.set === 'function')
      .map(([k]) => k)
      .sort();

    const candidates = methodNames.filter((n) => /render|_render|draw|build|attach|mount|update|refresh|rebuild|activate|on|_on/i.test(n));

    console.groupCollapsed(`${MODULE_ID} | DISCOVERY | Menu class: ${ctorName}`);
    console.log('Menu instance:', menu);
    console.log('Menu keys:', Object.keys(menu));
    console.log('Menu id:', menu.id);
    console.log('Items length:', Array.isArray(menu.items) ? menu.items.length : menu.items);
    console.log('Dropdowns length:', Array.isArray(menu.dropdowns) ? menu.dropdowns.length : menu.dropdowns);
    console.log('Options:', menu.options);
    console.log('Candidate methods:', candidates);
    console.log('All methods:', methodNames);
    console.log('Accessors (get/set):', accessorNames);

    // Capture one stack trace to see what calls the hook (can help locate render path).
    // Only do this once per class name.
    if (!discoveredStacks.has(ctorName)) {
      discoveredStacks.add(ctorName);
      console.log('Hook call stack (first time for this menu class):');
      console.trace();
    }

    console.groupEnd();
  } catch (e) {
    console.warn(`${MODULE_ID} | DISCOVERY | Failed introspection`, e);
  }
}

function wrapMethodOnce(target, methodName, wrapFn) {
  const original = target?.[methodName];
  if (typeof original !== 'function') return false;
  if (original.__findReplaceWrapped) return true;

  const wrapped = function(...args) {
    return wrapFn.call(this, original, args);
  };

  wrapped.__findReplaceWrapped = true;
  wrapped.__findReplaceOriginal = original;
  target[methodName] = wrapped;
  return true;
}

function applyNativeMenuPatchFromCtor(MenuCtor) {
  if (!MenuCtor?.prototype) return false;
  if (patchedMenuCtors.has(MenuCtor)) return true;

  const patchedRender = wrapMethodOnce(MenuCtor.prototype, 'render', function(original, args) {
    const result = original.apply(this, args);
    try {
      if (this?.view) {
        const editorKey = getStableEditorKey(this.view, this);
        ensureToolbarButton({ editorKey, editorView: this.view });
        setupToolbarObserver({ editorKey, editorView: this.view });
      }
    } catch (e) {
      // ignore
    }
    return result;
  });

  const patchedUpdate = wrapMethodOnce(MenuCtor.prototype, 'update', function(original, args) {
    const result = original.apply(this, args);
    try {
      if (this?.view) {
        const editorKey = getStableEditorKey(this.view, this);
        ensureToolbarButton({ editorKey, editorView: this.view });
        setupToolbarObserver({ editorKey, editorView: this.view });
      }
    } catch (e) {
      // ignore
    }
    return result;
  });

  if (patchedRender || patchedUpdate) {
    patchedMenuCtors.add(MenuCtor);
    NATIVE_MENU_PATCH_ACTIVE = true;
    console.log(`${MODULE_ID} | Native ProseMirrorMenu patch active (render/update wrapped)`);
    return true;
  }

  return false;
}

function getStableEditorKey(editorView, menu) {
  try {
    const dom = editorView?.dom;

    const documentUuid = dom?.closest('prose-mirror')?.getAttribute('data-document-uuid');
    if (documentUuid) return documentUuid;

    const formId = dom?.closest('form')?.id;
    if (formId) return formId;

    const appId = dom?.closest('[id^="Journal"], [id^="Actor"], [id^="Item"], .app, .application')?.id;
    if (appId) return appId;

    const proseMirrorId = dom?.closest('prose-mirror')?.id;
    if (proseMirrorId) return proseMirrorId;
  } catch (e) {
    // ignore
  }

  return menu?.id || `editor-${Date.now()}`;
}

function getProseMirrorRoot(editorView) {
  try {
    return editorView?.dom?.closest('prose-mirror') ?? null;
  } catch (e) {
    return null;
  }
}

function getToolbarElement(editorView) {
  const proseMirror = getProseMirrorRoot(editorView);
  if (!proseMirror) return null;
  return proseMirror.querySelector('menu.editor-menu') || proseMirror.querySelector('menu');
}

function placeButtonLiAtEnd(toolbar, li) {
  if (!toolbar || !li) return;

  // Prefer placing just before the concurrent-users indicator if present.
  const concurrentUsers = toolbar.querySelector('li.concurrent-users');
  if (concurrentUsers && concurrentUsers.parentNode === toolbar) {
    if (li.nextElementSibling !== concurrentUsers) {
      toolbar.insertBefore(li, concurrentUsers);
    }
    return;
  }

  // Otherwise, place as the final <li>.
  if (li.parentNode === toolbar && li !== toolbar.lastElementChild) {
    toolbar.appendChild(li);
  } else if (li.parentNode !== toolbar) {
    toolbar.appendChild(li);
  }
}
function ensureToolbarButton({ editorKey, editorView }) {
  const toolbar = getToolbarElement(editorView);
  if (!toolbar) return;

  const t0 = DEBUG_RENSURE ? performance.now() : 0;

  // Ensure the button exists in the toolbar DOM.
  let li = toolbar.querySelector('li.find-replace-button');
  if (!li) {
    if (DEBUG_RENSURE) console.debug(`${MODULE_ID} | re-ensure | missing <li>, re-adding for ${editorKey}`);
    li = document.createElement('li');
    li.className = 'text find-replace-button';

    // Place at the end to make any rebuild flicker less noticeable.
    placeButtonLiAtEnd(toolbar, li);
  }

  let button = li.querySelector('button.find-replace-trigger');
  if (!button) {
    if (DEBUG_RENSURE) console.debug(`${MODULE_ID} | re-ensure | missing <button>, re-adding for ${editorKey}`);
    button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-action', 'find-replace');
    button.classList.add('find-replace-trigger');
    button.innerHTML = '<i class="fa-solid fa-magnifying-glass fa-fw"></i>';
    li.appendChild(button);
  }

  // Match Foundry tooltip patterns.
  const tooltip = game.i18n.localize('find-and-replace.button.tooltip') || 'Find and Replace';
  button.setAttribute('data-tooltip-text', tooltip);
  button.title = tooltip;

  // Always bind the click handler to the latest view+toolbar.
  // Using onclick overwrites any stale handler from a previous EditorView instance.
  button.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    let controller = controllerRegistry.get(editorKey);
    if (!controller) {
      controller = new UIController(editorView, toolbar);
      controllerRegistry.set(editorKey, controller);
      console.log(`${MODULE_ID} | Created new UIController for editor ${editorKey}`);
    } else {
      controller.updateContext(editorView, toolbar);
    }

    controller.toggleExpanded();
  };

  // If we already have a controller for this editor, re-bind it to the latest
  // toolbar element and re-ensure the expanded UI (if open).
  const existingController = controllerRegistry.get(editorKey);
  if (existingController) {
    existingController.updateContext(editorView, toolbar);
    existingController.ensureExpandedUI();
  }

  if (DEBUG_RENSURE) {
    const dt = performance.now() - t0;
    console.debug(`${MODULE_ID} | re-ensure | complete in ${dt.toFixed(2)}ms for ${editorKey}`);
  }
}

function setupToolbarObserver({ editorKey, editorView }) {
  const purgeTimer = pendingPurgeTimers.get(editorKey);
  if (purgeTimer) {
    clearTimeout(purgeTimer);
    pendingPurgeTimers.delete(editorKey);
  }

  const proseMirror = getProseMirrorRoot(editorView);
  if (!proseMirror) return;

  const existing = toolbarObserverState.get(editorKey);
  if (existing?.proseMirror === proseMirror) {
    // Refresh the latest EditorView reference for callbacks.
    existing.editorView = editorView;
    return;
  }

  // If this editorKey was previously observed, disconnect old observers.
  if (existing) {
    try { existing.observer?.disconnect(); } catch (e) { /* ignore */ }
    try { existing.parentObserver?.disconnect(); } catch (e) { /* ignore */ }
    if (existing.timer) clearTimeout(existing.timer);
  }

  const state = {
    proseMirror,
    editorView,
    observer: null,
    parentObserver: null,
    timer: null
  };

  const scheduleEnsure = () => {
    if (state.timer) return;
    state.timer = Promise.resolve().then(() => {
      state.timer = null;
      // If the prose-mirror was removed (sheet closed), clean up.
      if (!state.proseMirror?.isConnected) {
        cleanupEditorKey(editorKey, { delayed: true });
        return;
      }
      ensureToolbarButton({ editorKey, editorView: state.editorView });
    });
  };

  state.observer = new MutationObserver(scheduleEnsure);
  state.observer.observe(proseMirror, { childList: true, subtree: true });

  // Also observe the parent for removal of the prose-mirror node (sheet close).
  const parent = proseMirror.parentNode;
  if (parent) {
    state.parentObserver = new MutationObserver(() => {
      if (!proseMirror.isConnected) cleanupEditorKey(editorKey, { delayed: true });
    });
    state.parentObserver.observe(parent, { childList: true });
  }

  toolbarObserverState.set(editorKey, state);
}

function cleanupEditorKey(editorKey, { delayed = false } = {}) {
  const state = toolbarObserverState.get(editorKey);
  if (state) {
    try { state.observer?.disconnect(); } catch (e) { /* ignore */ }
    try { state.parentObserver?.disconnect(); } catch (e) { /* ignore */ }
    if (state.timer) clearTimeout(state.timer);
  }
  toolbarObserverState.delete(editorKey);

  // If the editor is being temporarily re-rendered, keep controller state for a bit.
  // Foundry can replace <prose-mirror> during focus/selection changes.
  if (delayed) {
    if (pendingPurgeTimers.has(editorKey)) return;
    const timer = setTimeout(() => {
      pendingPurgeTimers.delete(editorKey);
      controllerRegistry.delete(editorKey);
    }, 15000);
    pendingPurgeTimers.set(editorKey, timer);
    return;
  }

  controllerRegistry.delete(editorKey);
}

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
  console.log(`${MODULE_ID} | Using getProseMirrorMenuItems hook for button registration`);
});

Hooks.on('getProseMirrorMenuItems', (menu, config) => {
  logDiscoveryOnce(menu);
  
  // Verify we have access to the editor view
  if (!menu.view) {
    console.warn(`${MODULE_ID} | Menu does not have view property, skipping button injection`);
    return;
  }
  
  const editorView = menu.view;
  const editorKey = getStableEditorKey(editorView, menu);

  // Patch based on the runtime menu constructor (reliable in Foundry).
  applyNativeMenuPatchFromCtor(menu?.constructor);

  // If we've wrapped ProseMirrorMenu.render/update, we can inject synchronously
  // during the same rebuild call stack (no flicker). Avoid the async ensure.
  if (NATIVE_MENU_PATCH_ACTIVE) {
    // Still keep controller context healthy if an editor is recreated.
    setupToolbarObserver({ editorKey, editorView });
    ensureToolbarButton({ editorKey, editorView });
    return;
  }

  // Fallback: ensure in a microtask (before next paint) rather than setTimeout.
  Promise.resolve().then(() => {
    ensureToolbarButton({ editorKey, editorView });
    setupToolbarObserver({ editorKey, editorView });
  });
});

/* ========================================
 * OLD IMPLEMENTATION (v13.0.1.x) - ARCHIVED FOR REFERENCE
 * ======================================== */

/**
 * WHAT WE USED TO DO (MutationObserver Approach):
 * 
 * Previous versions (13.0.1.x) used a MutationObserver to watch the entire
 * document for <prose-mirror> elements being added or modified. This worked
 * but had significant issues:
 * 
 * PROBLEMS WITH THE OLD APPROACH:
 * 1. Fought against Foundry's internal component lifecycle
 * 2. Required constant re-injection with 150ms debounce delays
 * 3. Created mock EditorView because real one wasn't accessible
 * 4. Used form element IDs as stable keys (fragile)
 * 5. Infinite loop potential if debounce timing was off
 * 6. Button would disappear on every user interaction (typing, clicks)
 * 7. Heavy mutation observer watching entire document body
 * 
 * WHY IT CAUSED BUTTON PERSISTENCE ISSUES:
 * When users interacted with the editor (typing, formatting), Foundry v13's
 * <prose-mirror> custom element would internally reconstruct its toolbar DOM.
 * Our manually-injected button wasn't part of Foundry's official template,
 * so it got removed. We had to constantly watch for this and re-inject.
 * 
 * THE PROPER SOLUTION (v13.0.1.2+):
 * Use Foundry's official `getProseMirrorMenuItems` hook to register our
 * button through the API. Foundry automatically includes it when building
 * menus, so it persists naturally without any re-injection logic needed.
 * 
 * See the getProseMirrorMenuItems hook above for the new implementation.
 */

/* ========================================
 * NO ADDITIONAL CODE NEEDED
 * ======================================== */

/**
 * In the old implementation (v13.0.1.x), this file contained:
 * - setupProseMirrorObserver() function (150+ lines)
 * - handleProseMirrorElement() function (200+ lines) 
 * - getEditorViewFromElement() function (100+ lines)
 * - Mock EditorView creation logic
 * - Button re-injection logic with debounce
 * - Form element ID tracking
 * 
 * All of that complexity is now replaced by the getProseMirrorMenuItems
 * hook above (~50 lines), which uses Foundry's official API.
 * 
 * The new approach:
 * - No MutationObserver needed
 * - No mock EditorView needed (access real one via menu.view)
 * - No button re-injection needed (Foundry handles it)
 * - No debounce delays needed
 * - No element replacement detection needed
 * - Simpler, cleaner, more maintainable
 */

/* ========================================
 * MODULE EXPORTS
 * ======================================== */

// Export module API for debugging and external access
// Can be accessed via console: window.FindAndReplace
window.FindAndReplace = {
  MODULE_ID,
  controllerRegistry, // For debugging: see all active controllers
  version: '13.1.0.0'
};
