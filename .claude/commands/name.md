Name your Claude Pet!

Give your pet a special name. Usage: `/name Buddy`

```bash
NAME="$ARGUMENTS"
if [ -z "$NAME" ]; then
  if [ -f ~/.claude-pet/name.txt ]; then
    CURRENT=$(cat ~/.claude-pet/name.txt)
    echo ""
    echo "🏷️ Your pet's name is: $CURRENT"
    echo "To rename, use: /name <new-name>"
    echo ""
  else
    echo ""
    echo "🏷️ Your pet doesn't have a name yet!"
    echo "Give it one with: /name <name>"
    echo ""
  fi
else
  mkdir -p ~/.claude-pet
  echo "$NAME" > ~/.claude-pet/name.txt
  echo ""
  echo "🎉 Your pet is now named '$NAME'!"
  echo "All interactions will use this name from now on."
  echo ""
fi
```
