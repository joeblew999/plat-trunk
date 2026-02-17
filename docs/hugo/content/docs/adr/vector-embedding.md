# vector embedding

Gemini help: https://gemini.google.com/app/6dcc30499f6e84b6


We want docs and 3d models searchable by AI

stl and step is what Truck can take IN and OUT. We need to be first setup i guess ? 

https://github.com/kreuzberg-dev/kreuzberg looks like a strong contenrd and so make a task file sub system with the source in .src 

Now about the system that we need to use and embrace:

https://news.ycombinator.com/item?id=46968374

https://cad-search-three.vercel.app is the runing example and you can ask for a 3d model and it finds tham and gives you the STL or STEP, with a nice 3D view. We have the 3D viewer thanks to Truck, and the ability to use the STL and STEP thansk to truck.

https://www.finalrev.com/blog/embedding-one-million-3d-models explains the project and Embedding One Million Parts which we need to design for.

https://deep-geometry.github.io/abc-dataset/ is the Datastet they used. we need to also use this then. It explaisn the relationship between stzep and stl. Seems STL is used for assembly, which we need to design for so that we can make big things out of little things. feels vert OLAP and OLTP. 

https://huggingface.co/datasets/daveferbear/3d-model-images-embeddings is the system.


https://docs.kreuzberg.dev/guides/plugins/#ocr-backends because my friend suggests i probably need an OCR backend. Not sure why !! 

We really need to fully deep dive kreuzberg and work out how this can all work with truck and AI aspects in the things above !! 

And we need to work out how we can run some of it on Cloudflare. Gemini suggests using the Cloudflare workers AI. 

I did a search and yes they support cloudflare:

https://docs.kreuzberg.dev/concepts/performance/?q=cloudflare

https://docs.kreuzberg.dev/getting-started/quickstart/?h=cloudflare

https://docs.kreuzberg.dev/reference/api-wasm/?h=cloudflare#cloudflare-workers

https://docs.kreuzberg.dev/getting-started/installation/?h=cloudflare#cloudflare-workers

https://docs.kreuzberg.dev/reference/api-wasm/?h=cloudflare#memory-issues-in-cloudflare-workers

https://docs.kreuzberg.dev/concepts/architecture/?h=cloudflare#typescript-bindings-native-vs-wasm so that it can work in brwoser too which we can leverage !




https://docs.kreuzberg.dev/guides/agent-skills/ is really important and so we need to add this !! We already have a basic task file system for this and other sub systems we use !! so make sure this is automated too. might need to revisit it.  saw this in the docs https://github.com/vercel-labs/skills so maybe we use that with bun ?  would seem to suggest a taskfile just for AI skills is needed ? 






