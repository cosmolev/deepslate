# Vanilla block rendering fixes

Based on upstream deepslate 0.27.2, revision
`c33b4a65f2ad474b14aab71061fbd7766b675fad`. This fork keeps the upstream MIT license.

The Java 1.21.1 regression cases cover wall-mounted skulls and heads, floor-head
orientation, the default player skin overlay, undyed shulker boxes, banner base
texture lookup, closed double-chest geometry, and static End portal/gateway
surfaces. Block-model checks cover UV locking, rotated culling, partial top/bottom
face UVs, and angle-dependent element rescaling.

Geometry expectations were checked against Java 1.21.1's official client
(`client.jar` SHA-1 `30c73b1c5da787909b2f73340419fdf13b9def88`) and mappings
(`client.txt` SHA-1 `2244b6f072256667bcd9a73df124d6c58de77992`). Minecraft game code
and assets are not distributed by this fork. The host supplies version-matched
textures. Portals use static textures; their animated, view-dependent shaders
and block-entity instance contents are not emulated by these model tests.

Run `npm ci`, `npm run build`, and `npx vitest run -r ./test --threads=false`.
The focused tests are `test/render/VanillaSpecialRenderer.test.ts` and
`test/render/BlockModelGeometry.test.ts`. The application separately audits every
state and model reference in its pinned resource catalog and exercises browser
fixtures. Build release packages with `npm pack --ignore-scripts` after testing;
consumers pin both the source revision and the resulting archive checksums.
