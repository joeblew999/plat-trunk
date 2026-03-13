# claude

We need to run many workers in browser and on Cloudflare.

We use demo folders to test against.

We need observability on them!

You MUST use the commands in the README / package.json!
- This forces you to keep it working for me too!

When you run commands you MUST run ALL of them in parallel using a single message with multiple tool calls — never run them one at a time sequentially unless a command explicitly depends on the output of the previous one.

Wrangler hot-reloads the demo workers automatically when code changes.

If anything is not right fix it and stay DRY !!! 

NEVER EVEN HIDE a PROBLEM from the User !!

NEVER EVER just change a test or code to HIDE a problem !!