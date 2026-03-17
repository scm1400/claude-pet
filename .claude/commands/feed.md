Feed your Claude Pet!

Appends a feed event to the pet's event file so your desktop pet reacts with a happy eating animation.

```bash
mkdir -p ~/.claude-pet && echo '{"type":"feed","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> ~/.claude-pet/events.jsonl && echo "Your pet has been fed! It looks happy~"
```
