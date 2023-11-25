# Gleam Sandbox

*A second try my unfinished [Enderchief/gleam-playground](https://github.com/Enderchief/gleam-remote-compiler/tree/master/packages/gleam-playground).
Special thanks to [JohnDoneth](https://github.com/JohnDoneth) for creating [JohnDoneth/gleam-playground](https://github.com/JohnDoneth/gleam-playground) which 
this takes heavy inspiration from.*

---

Gleam Sandbox aims to have a sandboxed Gleam environment which can be used for playing with Gleam or having embeddable Gleam demos.


### Goals for final release
- [x] Gleam Compiles
- [x] Bundle Gleam and JavaScript in the sandbox
- [x] Embed in an iframe
- [x] Package fetching from [hex.pm](https://hex.pm)
- [ ] Module Resolution :sob:
- [ ] Example code picker (Choose from an example to load)
- [ ] Write as much as possible in Gleam (probably not all of this)
    - [x] UI (mostly in Lustre, good enough)
    - [ ] Things needed for compilation to work
        - [ ] ffi for `compiler-wasm`
        - [ ] ffi for web workers
        - [ ] ffi for `esbuild-wasm`
        - [x] ffi for DOM interactions (exists!)
        - [ ] fast data validation library (comparable to Zod)
- [ ] Sharable Links
- [ ] resizable UI (perhaps a two panel setup where the code overlaps the iframe so that it can be hidden)
- [ ] make layout better suited for being embedded
- [x] cache deps locally (in memory after every build and in storage for revisiting the site)
- [ ] [LSP support](https://github.com/FurqanSoftware/codemirror-languageserver). perhaps fork and fix issues
- [ ] Tidy Lustre code
- [ ] Import code [npm](https://npmjs.com) packages in JavaScript source in the sandbox by changing import to `https://esm.sh/PACKAGE`.
- [ ] Upgrade [Lezer grammar](https://npmjs.com/package/@exercism/codemirror-lang-gleam) to increase support of features.
