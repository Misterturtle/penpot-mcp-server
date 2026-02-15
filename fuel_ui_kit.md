# Fuel UI Kit

- Library file: `Fuel UI Kit (Library)` (`98b186a7-aee9-8016-8007-92c03d0ab57d`)
- Library page: `Buttons` (`2823907a-ad55-48f4-ab80-d01242f982c2`)
- Linked token source: `Tokens starter kit` (`98b186a7-aee9-8016-8007-92a896062ef2`)
- Consumer demo page: `Demo Buttons` (`370dc0ce-c346-4ed6-8cc9-f842d1a09097`)

## Canonical Components (Use These)

- `Dark / Button / Back / Default / Composite` (`a189d6f3-77f8-4091-8109-cf3121859719`)
- `Dark / Button / Back / Hover / Composite` (`d7e8b96d-4b41-4789-a72c-0965e1875c91`)
- `Dark / Button / Back / Focus / Composite` (`e5581d63-0336-4b0d-b485-c47ba66719d1`)
- `Dark / Button / Back / Active / Composite` (`a955aa4f-0e08-4425-ada7-ff4692af6d17`)
- `Dark / Button / Back / Disabled / Composite` (`6e0630c8-6737-4c6d-b2bb-884f644fcc8a`)
- `Dark / Button / Log / Default / Composite` (`2d092693-9cce-444a-9d07-446a613547f8`)
- `Dark / Button / Log / Hover / Composite` (`95b08d25-a3d4-4498-a90f-5b666930a962`)
- `Dark / Button / Log / Focus / Composite` (`3b5abf96-39cb-4cdc-9c9f-fa5e8eb04b4d`)
- `Dark / Button / Log / Active / Composite` (`eda7d1a1-ffda-4e73-bab2-a66e29171c4e`)
- `Dark / Button / Log / Disabled / Composite` (`00836481-33b1-441d-82eb-c4fc28104a30`)

## Internal Primitives (Do Not Instantiate Directly)

- Back surface: `Dark / Button / Back / <State>`
- Back icon: `Dark / Button / Back / <State> / Icon`
- Log surface: `Dark / Button / Log / <State>`
- Log label: `Dark / Button / Log / <State> / Label`

## Token Binding Summary

- Back surface: `fill`, `r1/r2/r3/r4`, focus `stroke`
- Back icon: `fill`
- Log surface: `fill`, `r1/r2/r3/r4`, focus/disabled `stroke`
- Log label: `fill`, `fontSize`

## Sync Behavior

- Demo button matrix is instantiated from library components.
- Token changes propagate through linked libraries to component instances.
