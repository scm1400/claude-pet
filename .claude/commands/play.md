Play with your Claude Pet!

Appends a play event to the pet's event file so your desktop pet reacts with an excited playing animation.

```bash
mkdir -p ~/.claude-pet && echo '{"type":"play","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> ~/.claude-pet/events.jsonl && echo "You played with your pet! It's so excited~"
```
