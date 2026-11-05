# HIGHFLY P20 — GitHub Pages isolated publishing plan

## Never replace the official HIGHFLY demo
- Original public site: `drakenhok-star/HIGHFLY-ORIGIN-DEMO` `main`; keep all Pages settings/workflows unchanged.
- P20 source: `drakenhok-star/HIGHFLY-ORIGIN-DEMO`, branch `p20-fury-p16-static-training-pages-20261105`.
- P20 integration uses `/lab.html`, static 1/3 skeleton targets (stationary AI, real health, real damage, real directional knockback/launch).
- GitHub Pages offers ONE publishing source per repository. Selecting P20 branch as Pages source in this repo would REPLACE public site root; NOT ALLOWED.
- Safest: create a NEW PUBLIC EMPTY repository `HIGHFLY-FURY-SKILL-LAB` under user `drakenhok-star`. Connect it to Pages with Settings > Pages > Source: GitHub Actions. New repo is only required for strictly independent public URL; no Vercel project.
- A workflow in the NEW repo should checkout the P20 source branch from this PUBLIC original repo into its workspace, validate and deploy `index.html` as a copy of `lab.html` plus `lab.html`, `styles.css`, `src`, `lib`, `assets`, `LICENSE`, `PROVENANCE.md`.
- Because this is a separate repo and workflow, every Pages deployment is isolated by repository. It cannot replace the original site. The workflow can be manually rerun after updates; advanced cross-repo automation is optional.
- The original P20 repo's CI is QA-only: read-only token, no `pages: write`, no deployment.

## Request to user
Only ask the user to create a new **empty public repository** if complete independence is required. Do NOT ask them to modify original Pages settings.

## Safe deployment sketch (new repository only)

```yaml
name: Deploy FURY Skill Lab
on:
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    environment: github-pages
    steps:
      - uses: actions/checkout@v4
        with:
          repository: drakenhok-star/HIGHFLY-ORIGIN-DEMO
          ref: p20-fury-p16-static-training-pages-20261105
          persist-credentials: false
          path: game
      - run: |
          mkdir -p site
          cp -a game/lab.html game/styles.css game/src game/lib game/assets game/LICENSE game/PROVENANCE.md site/
          cp game/lab.html site/index.html
          touch site/.nojekyll
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: site
      - uses: actions/deploy-pages@v4
```

A new public repository must not receive any proprietary KayKit SOURCE packs.
