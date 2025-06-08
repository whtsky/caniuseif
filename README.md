# CanIUseIf

Ever found yourself wondering: "If my users' browsers can handle Feature X (which I'm already using), can they also handle shiny new Feature Y?" This tool helps answer that!

It's a quick way to see if a new web feature you're eyeing is likely to work for the folks whose browsers already support a feature you're currently relying on. Super handy for planning how to add new goodies to your site without breaking things for people.

## How's it do that (The Gist)

You pick two web features:
*   One you're **currently using**.
*   One you're **thinking about using**.

CanIUseIf digs into the browser support data.
It then tells you how well the browsers that support your *current* feature also support the *new* one. You'll get a clear "Looks Good!", "It's a Maybe...", or "Probably Not..." along with some numbers.

Cool trick: You can share your feature comparisons with a simple URL! For example: [https://caniuseif.whtsky.me/?base=declarative-shadow-dom&target=webp](https://caniuseif.whtsky.me/?base=declarative-shadow-dom&target=webp)

## Tech Stack (for the curious)

*   Frontend: React, Vite, TypeScript
*   Styling: Tailwind CSS
*   Browser Data: `caniuse-lite`
*   Icons: Lucide React

## Local dev

```bash
npm install
npm run dev
# To build for production:
# npm run build
```
