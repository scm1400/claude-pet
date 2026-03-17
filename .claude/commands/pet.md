Pet your Claude Pet!

Appends a pet event to the pet's event file so your desktop pet reacts with a happy purring animation.

```bash
mkdir -p ~/.claude-pet && echo '{"type":"pet","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> ~/.claude-pet/events.jsonl && echo "You petted your pet! It purrs happily~"
```
