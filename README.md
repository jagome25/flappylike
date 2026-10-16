# Flappy Art

A lightweight, responsive, unofficial fan-made arcade game. The character, carnival scenery, animation, particles, and sound effects are generated entirely in the browser—there are no copied film assets or external dependencies.

## Controls

- Desktop: Space, Enter, Arrow Up, or click to flap
- Mobile: tap the game to flap
- Pause: P, Escape, or the pause button
- Sound: M or the sound button

The best score is saved in the browser using `localStorage`.

## Run locally

You can open `index.html` directly, or serve the folder with any static server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deploy with GitHub Pages

1. Create a public GitHub repository and add these files.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select `main` and `/ (root)`, then save.
5. GitHub will provide a URL such as `https://YOUR-USERNAME.github.io/REPOSITORY/`.

## Embed in GoDaddy

Add an HTML/custom-code section and paste:

```html
<div style="display:flex;justify-content:center;width:100%">
  <iframe
    src="YOUR-GITHUB-PAGES-URL"
    title="Flappy Art fan game"
    style="width:100%;max-width:500px;height:860px;border:0;border-radius:18px;overflow:hidden"
    allow="fullscreen"
  ></iframe>
</div>
```

Start with a GoDaddy forced height of `900` pixels, then adjust if necessary.

## Disclaimer

This is an unofficial, noncommercial fan project. Its code and drawn artwork are original, and it does not use film imagery, audio, logos, or extracted assets.
