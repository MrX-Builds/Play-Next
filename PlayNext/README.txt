PLAY NEXT 1.1.1
================

Play Next adds one deliberately narrow feature to Stash:

  Hover a scene card and press Shift+N.

Each selected scene is appended to an ordered one-shot override queue for the
active Stash web player. Current playback is not paused, restarted, or
navigated away from. The overrides play in selection order. After the final
override, the player returns to the following scene in the original Stash
queue.

CONTROLS
--------

Shift+N while hovering a scene card
  Append that scene to the override queue. This works with main-grid cards,
  queue cards, and the lighter cards used by Similar Scenes. Selecting an
  already queued scene removes it. The currently playing override cannot be
  removed individually. A pink outline confirms the scene under the pointer.

Shift+Alt+N
  Clear the override queue from anywhere outside an input field. If an
  override is already playing, it finishes normally and the remaining
  overrides are cleared.

Queue controls
  The player queue shows every override in order, with individual Remove
  buttons and Clear all / Clear remaining.

No mouse button is intercepted. Normal left-click, middle-click, right-click,
double-click, selection, drag, and context-menu behavior remains available to
Stash, Copacetic, and other plugins.

INSTALLATION
------------

1. Stop Stash, or leave it running and refresh plugins afterward.
2. Extract the installable ZIP into your Stash plugins directory. The result
   must be:

     plugins/PlayNext/PlayNext.yml
     plugins/PlayNext/PlayNext.js
     plugins/PlayNext/README.txt
     plugins/PlayNext/CHANGELOG.txt

3. In Stash, open Settings > Plugins and click Reload Plugins (or restart
   Stash).
4. Hard-refresh the Stash browser tab (Ctrl+F5).
5. Open or focus a scene player. Hover any native scene card and press Shift+N.

HOW IT WORKS / PRIVACY
----------------------

- UI-only plugin; it does not write metadata or alter Stash's database.
- It makes one read-only findScene GraphQL query when a scene is selected.
- It uses Stash's supported PluginApi component patches for ScenePlayer and
  ScenePage.
- It preserves Stash's encoded queue parameters and restores the original next
  scene after the ordered overrides.
- A small localStorage record coordinates the player and scene cards across
  same-origin Stash windows (useful with a separate keyboard browser).

COMPATIBILITY
-------------

- Built for the current React/video.js Stash UI. A live Stash v0.32.0 server
  confirmed the version and exact read-only GraphQL query contract; player and
  queue compatibility were checked against the matching upstream component
  interfaces and isolated plugin tests.
- The implementation matches the current upstream ScenePlayer, ScenePage, and
  sceneQueue APIs as of 2026-11-02.
- Copacetic-friendly: all CSS is namespaced, uses existing Bootstrap button
  classes, and does not replace card markup or claim mouse events.
- Requires Stash's PluginApi.patch support and a same-origin link to the scene.
  Main-grid .scene-card markup is supported but no longer required. If those
  upstream extension points change in a future Stash release, the plugin will
  need a compatibility update.

LIMITATIONS
-----------

- The active player and the card window must use the same Stash origin
  (protocol, host, and port). Browser localStorage cannot cross origins.
- Shift+N only acts when the pointer is over a rendered native scene card.
- If the original queue is already exhausted, the override plays and then
  stops; there is no following original scene to restore.
- Queue restoration follows Stash's URL-encoded queue. Manually leaving the
  scene player or changing to a different queue while the override plays
  cancels the practical continuity of the saved route; use Cancel before a
  deliberate queue change.
- The packaged plugin was not installed into the user's running Stash during
  build verification, so a final end-to-end click-through remains an
  installation check. It was not possible to exhaustively test every
  third-party plugin combination.

