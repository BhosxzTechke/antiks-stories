# 🎓 Antiks Stories

A [Claude Code](https://claude.com/claude-code) skill that makes **1-minute cartoon story videos about the Philippines**: research → script → narration → animation → sound → finished MP4 for YouTube Shorts, TikTok, Facebook Reels and Instagram Reels.

👉 **Start here: [antiks-stories/README.md](antiks-stories/README.md)**. It covers what it does, the setup guide, how to use it, and how to make it yours.

## Quick start
1. Download this repo (green **Code** button → **Download ZIP**) and unzip it.
2. Open the `antiks-stories` folder, type `powershell` in the File Explorer address bar, and run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1 -Project "C:\Videos\MyChannel" -Install
   ```
3. Set your own channel name and host look in `C:\Videos\MyChannel\.claude\skills\antiks-stories\data\brand.json`.
4. Open `C:\Videos\MyChannel` in Claude Code, start a new chat, and type `/antiks-stories`.

## License
Code is [MIT](LICENSE). The "Antiks Stories" name, tagline, handle and default host design are reserved for the Antiks Stories channel. See the brand notice in [LICENSE](LICENSE).
