# Bookmarks

A personal, searchable archive of things worth keeping. New links are added
with a single command that researches and classifies the page via the
[z.ai GLM API](https://z.ai), and the site itself is a static Astro app
that renders every saved bookmark with category and tag filters.

## Add a bookmark

```sh
pnpm bm <url>           # research + save
pnpm bm <url> --force   # re-research and overwrite
pnpm bm <url> --dry-run # preview without saving
```

Requires `ZAI_API_KEY` in `.env` (copy `.env.example`). See
[`AGENTS.md`](./AGENTS.md) for the full architecture and conventions.

## Bookmarks

### Development

- [Forgejo](https://forgejo.org/)
- [Grafana Cloud](https://grafana.com/products/cloud/grafana/)
- [Codebase Memory MCP](https://github.com/DeusData/codebase-memory-mcp)
- [Remotion Superpowers](https://github.com/DojoCodingLabs/remotion-superpowers)
- [rtk-ai/rtk](https://github.com/rtk-ai/rtk)
- [LLM Council Skill](https://github.com/gcpdev/llm-council-skill)
- [Manifest](https://github.com/mnfst/manifest)
- [OpenMontage](https://github.com/calesthio/OpenMontage)

### Learning

- [Raindrop AI Workshop](https://github.com/raindrop-ai/workshop)

### Productivity

- [Linear](https://linear.app/)
- [Baserow](https://baserow.io/)
- [Twenty](https://twenty.com/)
- [Documenso](https://documenso.com/)
- [Fallow](https://fallow.tools/)
- [Headroom](https://github.com/gglucass/headroom-desktop)

### AI

- [Replicate](https://replicate.com/)
- [Krea AI](https://www.krea.ai/image)
- [Viggle AI](https://viggle.ai/)
- [karpathy/llm-council](https://github.com/karpathy/llm-council)
- [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)
- [Andrej Karpathy Skills](https://github.com/multica-ai/andrej-karpathy-skills)
- [Egonex AI Understand Anything](https://github.com/Egonex-AI/Understand-Anything)
- [claude-howto](https://github.com/luongnv89/claude-howto)
- [Panniantong/agent-reach](https://github.com/Panniantong/agent-reach)

### Tools

- [listmonk](https://listmonk.app/)
- [Formbricks](https://formbricks.com/)

### Reference

- [Trail of Bits Skills](https://github.com/trailofbits/skills)
