# Official blueprint fixture

`officialGraph.json` is an unchanged copy of the challenge server's public
`graph.json`, downloaded for Phase 4 acceptance coverage.

- Repository: https://github.com/mosaic-avantos/frontendchallengeserver
- Commit: `fdfbb9c78eb8ac518f952be183a3718098005265`
- Pinned source: https://github.com/mosaic-avantos/frontendchallengeserver/blob/fdfbb9c78eb8ac518f952be183a3718098005265/graph.json
- Downloaded: 2026-10-13
- SHA-256: `bef74daa5b072ccbbe408eb3b79f5377168c84c661d662a6f9812bb68dd1d19c`

The fixture includes six nodes, shared form definitions, all supplied schema
fields (including `multi_select`), and empty input mappings. Unit tests continue
to use the smaller `src/mocks/sampleGraph.ts` fixture. Acceptance tests use this
snapshot and clone it before constructing missing/empty-data scenarios.

Tests run offline and do not fetch upstream data. To refresh the fixture, choose
an explicit upstream commit, replace the JSON, update this provenance and hash,
and review resulting behavior/test changes. Do not copy real customer data here.
