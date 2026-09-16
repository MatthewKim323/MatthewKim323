# Font provenance

`JetBrainsMono-Regular.woff2` is JetBrains Mono, obtained from the official [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) repository, `fonts/webfonts/JetBrainsMono-Regular.woff2`, on 2026-09-16. Its SIL Open Font License is included as `OFL.txt`.

`ProfileMono-Ascii.woff2` is a modified ASCII-only subset for self-contained SVG graphics. Its font names are changed to Profile Mono ASCII. It remains licensed under the SIL Open Font License. Generate it from the included upstream font with:

```sh
uv run --with fonttools --with brotli scripts/subset-font.py
```

The website uses the original font. SVG graphics embed the smaller subset, so they load without any external font request.
