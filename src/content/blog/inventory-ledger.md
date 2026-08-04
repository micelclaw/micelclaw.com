---
title: "#18 — Photograph a receipt, and your inventory fills itself in"
description: "Knowing what you own, where it is and what it's worth is one of those jobs everyone abandons after a week. So the work of keeping it current got moved off you: point a camera at a receipt, approve a list, done."
date: 2026-08-06
author: "Víctor"
tags: ["inventory", "selfhosted", "product", "ai"]
image: "/images/inventory-overview.jpg"
draft: false
---

Everyone who has ever started an inventory has abandoned it in week two. Not because it isn't useful — because keeping it current is a chore that pays off later and costs you now.

So the interesting question isn't what the module can store. It's how little you have to do to keep it true.

## THE ANSWER TO "WHAT DO I HAVE?"

![The inventory overview: totals, value by category, value by location](/images/inventory-overview.jpg)

Four numbers, then two charts that answer the two questions people actually ask: **what is it worth** and **where is it**.

The ring is value by category, with the total in the middle and the same data as a ranked list beside it — 54% of the value is one van, 16% is the firing system. The bars are value by location, so you can see that most of what you own is sitting in the rigging van and not in the warehouse you thought.

The amber card counts what's below its minimum. Two items. That's the entire low-stock feature: you set a floor on the things you don't want to run out of, and this number is how you find out.

## THE PART THAT DOES THE WORK FOR YOU

Underneath is a queue, and it's the reason the inventory stays current:

![The review queue: four proposed items with Approve buttons](/images/inventory-review.jpg)

Four items proposed, each with its price, each with a tag saying where it came from — `RECEIPT`. You didn't type any of them.

You photographed a receipt, or pressed a button on an order confirmation in your mail. A vision model reads it and pulls out each product, how many, the unit price, a category, the reference code, the shop and the date. **The model runs on your own machine** — the photo doesn't go to anyone's cloud, because there isn't one to go to.

And then it stops. It proposes; it doesn't add. You get Approve, an edit pencil, and a reject cross, and you can fix the price before you accept it. That's deliberate: a small model reading a crumpled receipt will get a line wrong now and then, and the person who should catch it is you, in the two seconds it takes to glance at a list — not in six months when the numbers don't add up.

Two small mercies that came out of using it:

- **Photograph the same receipt twice and nothing duplicates.** Each proposed line gets a fingerprint, so re-analysing an email you already processed adds nothing.
- **It works out your warranty.** If what you bought looks like electronics, an appliance or a tool, it sets the expiry three years out — the EU legal minimum — from the purchase date it read off the paper. There's a panel that warns you when there are fewer than 90 days left, for things you only ever photographed a receipt for.

## THE CATALOGUE

![The catalogue: name, category, location, quantity, value, warranty, tags, status](/images/inventory-catalog.jpg)

One row per thing, and the columns are the questions: what is it, what kind, where is it, how many, what's it worth, when does the warranty end, and what state is it in.

Quantities read `9.000/4.000` — how many you have over the minimum you set. When the first number drops below the second it goes red, which is how "Mortar rack (12 tubes)" is showing `3.000/4.000` in amber up there. No configuration, no alert rules to write. A number and a floor.

Filters across the top for category, status, location and tag, and a search box. Services sit in the same list as physical things, with a dash where the quantity would be, because "Fireworks show (rigging + firing)" is something you sell but never stock.

## NOTHING IS EVER DELETED

![The stock ledger, with every movement and its running balance](/images/inventory-stock.jpg)

Every arrival, sale, loan, transfer and recount is a line here, and the quantity on the catalogue page is the sum of them. Not a number someone typed over — the sum.

That means the history survives your mistakes. Correct a movement and you don't lose the original: a counter-movement appears next to it, and both stay. The button that does it says so on the tooltip, in as many words: *the ledger is never deleted*.

There's an `Undo` on every row for exactly that, and a `Receive document` button in the toolbar, which is the same receipt-reading trick pointed at a delivery note.

## AND A SCANNER THAT ASKS FIRST

The round button in the corner opens the camera, but not straight into a scan. It asks what you're doing first, with four options:

- **Locate** — open whatever this is, or the bin it's in
- **Count** — adjust the quantity, for a stocktake
- **Move to bin** — transfer it somewhere else
- **Check in / out** — return a loan, or lend it

Which sounds like a small thing until you've used a scanner that guesses. Same barcode, four completely different intentions, and no way to undo the wrong one gracefully. Stick a QR label on a box, scan it, pick *Locate*, and you get a list of what's inside without opening it.

## WHAT IT DOESN'T DO YET

- **No printable QR labels for items yet** — only for locations. Boxes and shelves, yes; individual things, not yet.
- **No mobile stocktake mode.** You can count with the scanner one item at a time, but there's no "walk the shelf and tick things off" flow.
- **The loan reminder button is disabled.** You can lend something with a return date and see it go overdue, but the nudge isn't wired up yet.
- **Serial numbers and batches aren't there.** Right now ten identical things are a quantity of ten, not ten tracked units.

## THE TAKEAWAY

An inventory is only worth having if it's true, and it's only true if updating it is nearly free. Everything above is in service of that: a camera instead of a keyboard, a queue you approve instead of a form you fill in, a floor number instead of an alert rule, and a history that survives being wrong.

**The best inventory feature is the one that means you don't have to do the inventory.**

---

*Next up: your photos. Type what you half-remember about one — the colour of a door, a city, someone's face — and see if it finds it.*
