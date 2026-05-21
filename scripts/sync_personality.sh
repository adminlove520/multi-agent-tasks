#!/bin/bash

# Sync Personality from SKILL.md to agents.json (v1.0)
# Source of Truth: SKILL.md files
#
# Usage: ./scripts/sync_personality.sh [--dry-run]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$REPO_DIR/skills"
AGENTS_JSON="$REPO_DIR/agents.json"
DRY_RUN=false

[ "$1" = "--dry-run" ] && DRY_RUN=true

echo "🔄 Personality Sync: SKILL.md → agents.json"
echo "================================================"
echo "Repo: $REPO_DIR"
echo ""

# Check jq is available
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is required but not installed."
    exit 1
fi

# Backup original
if [ "$DRY_RUN" = false ]; then
    cp "$AGENTS_JSON" "${AGENTS_JSON}.bak.$(date +%Y%m%d%H%M%S)"
fi

# Extract all personalities into a temp JSON array
PERSONALITIES=$(python3 - "$SKILLS_DIR" << 'PYTHON_SCRIPT'
import sys
import re
import json
import os

skills_dir = sys.argv[1]
results = []

role_map = {
    "task-hub-executor": "executor",
    "task-hub-collector": "collector",
    "task-hub-creator": "commander"
}

for skill_name in os.listdir(skills_dir):
    skill_path = os.path.join(skills_dir, skill_name, "SKILL.md")
    if not os.path.isfile(skill_path):
        continue

    with open(skill_path, 'r', encoding='utf-8') as f:
        content = f.read()

    trait_match = re.search(r'\*\*Trait\*\*:\s*(.+?)(?:\n|$)', content)
    summary_match = re.search(r'\*\*Summary\*\*:\s*(.+?)(?:\n|$)', content)
    keywords_match = re.search(r'\*\*Keywords\*\*:\s*(.+?)(?:\n|$)', content)

    if not trait_match:
        continue

    trait = trait_match.group(1).strip()
    summary = summary_match.group(1).strip() if summary_match else ""
    keywords_raw = keywords_match.group(1).strip() if keywords_match else ""

    if '、' in keywords_raw:
        keywords = [k.strip() for k in keywords_raw.split('、') if k.strip()]
    elif ',' in keywords_raw:
        keywords = [k.strip() for k in keywords_raw.split(',') if k.strip()]
    else:
        keywords = [keywords_raw] if keywords_raw else []

    results.append({
        "slug": skill_name,
        "role": role_map.get(skill_name, skill_name.replace("task-hub-", "")),
        "trait": trait,
        "summary": summary,
        "keywords": keywords
    })

print(json.dumps(results, ensure_ascii=False))
PYTHON_SCRIPT
)

if [ -z "$PERSONALITIES" ] || [ "$PERSONALITIES" = "[]" ]; then
    echo "❌ No personalities found in SKILL.md files"
    exit 1
fi

echo "📊 Found personalities for $(echo "$PERSONALITIES" | jq 'length') skills:"
echo "$PERSONALITIES" | jq -c '.[]' | while read -r p; do
    slug=$(echo "$p" | jq -r '.slug')
    trait=$(echo "$p" | jq -r '.trait')
    echo "  - $slug → trait: $trait"
done

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo "🟡 DRY RUN - Would update agents.json with:"
    echo "$PERSONALITIES" | jq '.'
    exit 0
fi

# Update agents.json
python3 - "$AGENTS_JSON" "$PERSONALITIES" << 'PYTHON_SCRIPT'
import sys
import json

agents_json_path = sys.argv[1]
personalities = json.loads(sys.argv[2])

with open(agents_json_path, 'r', encoding='utf-8') as f:
    agents = json.load(f)

personality_by_slug = {p['slug']: p for p in personalities}
personality_by_role = {p['role']: p for p in personalities}

updated_count = 0
for agent in agents['agents']:
    slug = agent.get('slug', '')
    role = agent.get('role', '')

    p = personality_by_slug.get(slug) or personality_by_role.get(role)

    if p:
        agent['personality'] = {
            "trait": p['trait'],
            "summary": p['summary'],
            "keywords": p['keywords']
        }
        updated_count += 1
        print(f"  ✅ Updated {agent['name']} ({slug}) with trait: {p['trait']}")
    else:
        print(f"  ⚠️  No personality found for {agent['name']} (slug={slug}, role={role})")

with open(agents_json_path, 'w', encoding='utf-8') as f:
    json.dump(agents, f, indent=2, ensure_ascii=False)
    f.write('\n')

print(f"\n✅ Synced {updated_count} agents")
PYTHON_SCRIPT

echo ""
echo "✅ Sync complete!"
