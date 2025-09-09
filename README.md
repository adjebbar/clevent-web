Clevent Web NFC Clone
=====================

This is a simple clone of Clevent implemented as a Web App using the Web NFC API.

Features
--------
- Client: read balance/daily/seq from tag
- Seller: process purchase, debit balance, show QR receipt
- Admin: initialize tag, top-up

How to run locally
------------------
1. Serve files over HTTPS (required by Web NFC). You cannot just open index.html via file://
2. Simplest option: create a GitHub repository and push these files.
3. Enable GitHub Pages in repo settings -> Pages -> select branch "main" and folder "/" (root).
4. Your app will be live at https://yourusername.github.io/repo-name/

How to test
-----------
- Open the page on Android Chrome (>=89).
- Tap "Client" -> "Scan Tag" and present NFC tag.
- Tap "Admin" -> init or topup.
- Tap "Seller" -> process purchase.

Limitations
-----------
- Works only on Android browsers supporting Web NFC.
- Does not work on iOS Safari.
- Master key stored in localStorage (prototype only).
- For production: backend + secure element recommended.

