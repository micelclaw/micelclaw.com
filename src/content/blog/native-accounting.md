---
title: "#17 — Three ways to look at your money. Pick the one that's you."
description: "The money module in Micelclaw isn't one screen trying to serve everyone. It's three: one for a person who wants to know where it went, one for a freelancer chasing invoices, and one for a company that has to file. Same data, three lenses."
date: 2026-08-03
author: "Víctor"
tags: ["finance", "selfhosted", "product", "dashboard"]
image: "/images/finance-personal.jpg"
draft: false
---

Most money software makes you a promise it can't keep: that one screen can serve a person tracking their spending, a freelancer chasing an unpaid invoice, and a company that has to file a VAT return. You end up with a tool that's too heavy for the first and too thin for the last.

So the first thing you choose in Micelclaw isn't a report. It's who you are today.

![The lens switcher: Personal, Invoicing, Accounting](/images/finance-lenses.jpg)

Three lenses over exactly the same data. Nothing is duplicated, nothing is synced, and you never have to visit the one that isn't yours.

## PERSONAL — WHERE DID IT ACTUALLY GO

This is the lens for a question everyone has and almost nobody can answer on demand: *am I better off than I was in January, and what am I spending it on?*

![The Personal lens: net worth, spending, savings rate, and the charts](/images/finance-personal.jpg)

Five numbers across the top, and each one has a subtitle telling you what it's made of, because a figure without its definition is just decoration. Net worth is everything you own minus everything you owe. Available balance is only the accounts you can actually spend from — the sum on the left doesn't include money that's owed to you, which is the single most common way people fool themselves.

The savings rate says **24%**, and underneath, in smaller type, *you save 6560,86 €*. A percentage tells you how you're doing; the euros tell you what it bought. Both, always.

Then three charts that answer three different questions:

- **Net worth over time** — the shape of the last twelve months. Steps up are money arriving; the long flat stretches are the interesting part.
- **Expense by category** — a ring, and next to it the same thing as a ranked list with percentages and amounts. Salaries 51%, Utilities 14%, Insurance 10%. You can flip the whole panel to Income with one click and see where it comes from instead.
- **Cash flow** — money in and money out, month by month, with the running balance drawn over the top.

Below that, your accounts with their real balances, and the most recent movements. Notice that some of those movements have a small grey label to the right — *Corporate tax payable*, *Social security payable*. That's the system telling you which account each one landed in, without you having to ask.

## INVOICING — WHO OWES YOU, AND WHO ARE YOU AVOIDING

The freelancer's lens. It exists because "how's business?" is really four questions, and they have four different answers.

![The Invoicing lens: invoiced, collected, pending, overdue](/images/finance-invoicing.jpg)

**Invoiced** is what you've billed. **Collected** is what actually arrived. **Pending** is what's owed to you and still in date. **Overdue** is the one to look at on a Monday morning. Four numbers, four colours, and the difference between the first two is the whole reason freelancers run out of money while "doing well".

The same row repeats underneath for the other direction — what you've been billed, what you've paid, what you owe, what's late. And then the two figures that matter at the end of a quarter: the result for the period, spelled out as `29.222,33 € invoiced − 7541,98 € expenses`, and the VAT you'll owe, spelled out as `charged 5113,30 € − paid 1112,48 €`. No black boxes. Every headline number shows its arithmetic.

Further down there's an ageing breakdown — how old your unpaid invoices are, in buckets, with the percentages — and your top customers as bars, so you can see at a glance whether one client is quietly becoming your whole business.

The invoice list itself is deliberately boring, which is the point:

![The invoice list with status chips](/images/finance-invoices.jpg)

Number, customer, issued, due, total, status. Sent, Paid, Overdue, Draft. A draft has no number yet — it shows a dash — because numbering an invoice you might delete is how you end up with gaps you have to explain later.

Click a customer and you get their whole file on one page:

![A customer record with their details and documents](/images/finance-contact.jpg)

Tax ID, currency, payment terms, email, address, and every document you've exchanged with them, each with its status and amount. The same list holds customers and suppliers, filtered by a chip at the top, because in real life the same company is often both. And there's an **Open in CRM** button, since a customer here is the same contact as everywhere else on your server — not a second copy that drifts.

## ACCOUNTING — THE PART YOU HAND TO SOMEONE ELSE

The third lens is the one most people will open twice a year, and that's fine. It's there so that when your accountant asks for something, the answer is a click and not an evening.

![The Accounting lens: result, cash, VAT, net worth, and quick actions](/images/finance-accounting.jpg)

Four figures, a profit-and-loss summary, and four shortcuts to the things an accountant actually names: the journal, the chart of accounts, the tax forms. And in the corner, quietly, a line that says **The books balance.**

That line is doing a lot of work. Underneath all three lenses is real double-entry bookkeeping — the same method your accountant uses, with a Spanish chart of accounts, VAT rates and withholding built in. You never see any of it from the Personal lens. You just get a sentence confirming that everything you did this month added up.

If you *do* want to look, the trial balance is right there:

![The trial balance, with debit and credit columns](/images/finance-trial.jpg)

And here's a detail worth pausing on, because it's the kind of thing that separates a real ledger from a spreadsheet with ambitions. Look at the account codes: `400` appears five times, once per supplier. `430` appears once per customer. That's not a bug. In proper bookkeeping those codes are *categories*, not identities — every customer gets their own receivable account, all filed under 430. It means you can ask "how much does Marina Costa Brava owe me?" and "how much is owed to me in total?" and both are one query.

## ONE BOX, SEVERAL COMPANIES

There's a small dropdown next to the module name that says **Principal**. That's the profile switcher.

If you run more than one thing — a company and your own freelance work, or two businesses — they live in the same box and one click apart, with completely separate books, invoices, customers and tax numbers. Nothing leaks between them, and you don't need a second server or a second subscription.

## WHAT IT DOESN'T DO YET

Being straight about the edges:

- **No electronic invoicing yet.** Spain is moving towards mandatory structured e-invoices (Facturae, and reporting straight to the tax agency). We generate PDFs, not signed XML. That's the biggest gap and we know it.
- **The tax forms are calculations, not filings.** It works out your quarterly VAT and your withholdings and shows you the numbers. It does not submit anything, and you can't yet save a snapshot of a form as you filed it.
- **The quarterly income-tax instalment is a simple version.** It applies the flat rate to income minus expenses. It's not a personal tax return and doesn't pretend to be.
- **Bank connections are import, not sync.** You bring in a CSV or an OFX file from your bank and match it against your books. There's no live feed.

## THE TAKEAWAY

The reason this took three lenses instead of one is that the alternative is a screen full of things you have to learn to ignore.

A person shouldn't have to know what a chart of accounts is to find out where their money went. A company shouldn't have to lose the general ledger because the interface was simplified for someone else. So: same data underneath, three doors in, and the door you don't need stays shut.

**You should be able to answer "how am I doing?" without first learning accounting.**

---

*Next up: the same idea, pointed at your things instead of your money — and the bit where you photograph a receipt and your inventory fills itself in.*
