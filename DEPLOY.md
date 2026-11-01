# Putting IB Grind online

The website runs on **Vercel**. Sign-in and the database run on **Firebase** (Google). Both free tiers are plenty for this app, so no credit card is needed.

Allow about 15 minutes. Do part 1 first, because part 2 needs a value from it.

---

## Part 1: Firebase (accounts + database)

1. Go to **[console.firebase.google.com](https://console.firebase.google.com)** and sign in with your Google account.
2. Click **Create a project**. Name it something like `ib-grind`. Google Analytics isn't needed, so you can switch it off. Click **Create project**.
   You stay on the free **Spark** plan; there's no need to upgrade.
3. **Turn on Google sign-in.** In the left menu, open **Build → Authentication → Get started**. Under **Sign-in method**, choose **Google**, switch on **Enable**, pick your email as the support email, and click **Save**.
4. **Create the database.** Open **Build → Firestore Database → Create database**.
   - Edition: **Standard**, if it asks.
   - Location: a Europe location (e.g. `eur3`), close to the Vercel servers (`fra1`). This can't be changed later.
   - Rules: **Start in production mode**. Click **Create**.
5. **Set the security rules.** Still in Firestore, open the **Rules** tab. Replace everything there with the contents of [`firestore.rules`](firestore.rules) from this repo, then click **Publish**.
   These rules mean each person can only ever read and write their own progress.
6. **Register the web app.** Click the gear icon (**Project settings**). Under **Your apps**, click the web icon `</>`, name it `IB Grind`, leave "Firebase Hosting" unticked, and click **Register app**.
   You'll see a `firebaseConfig = { apiKey: …, authDomain: …, projectId: …, … }` block. Keep this page open.

> The `firebaseConfig` values are **not secret**. Every Firebase website sends them to the browser, and the security rules from step 5 protect the data. Sending them in chat or committing them to GitHub is fine.

## Part 2: Vercel (the website)

7. Go to **[vercel.com/new](https://vercel.com/new)**, sign in with GitHub, and **Import** the `KakiroX/peace4all` repository.
   Vercel detects Next.js automatically.
8. Give the site its Firebase config. Pick **one** option:
   - **Easiest:** paste the `firebaseConfig` block in chat, and Claude commits it to `lib/firebase-config.ts`. Nothing to set in Vercel.
   - **Or** in Vercel, open **Environment Variables** and add these, copying each value from `firebaseConfig`:

     | Name | Value from `firebaseConfig` |
     | --- | --- |
     | `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
     | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
     | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
     | `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |
     | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
     | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |

     If you add or change these after the first deploy, redeploy (**Deployments → ⋯ → Redeploy**), because they're baked in at build time.
9. Click **Deploy**. After a minute or two you get a URL such as `peace4all.vercel.app`.

## Part 3: Allow sign-in on your site

10. Back in Firebase: **Authentication → Settings → Authorized domains → Add domain**. Enter your Vercel domain, e.g. `peace4all.vercel.app`, without `https://`. If you add a custom domain later, add that too.

Done. Open the site and click **Sign in with Google** in the sidebar (on a phone, the button is top-right). Anything you practised before signing in is added to your account, and progress syncs between every device you sign in on.

---

### Good to know

- **Updates go live automatically.** Every push to the production branch (by default the repo's default branch, `dev`) redeploys. Other branches get preview URLs.
- **Preview URLs can't sign in** unless you add their domain in step 10. That's normal; use the main URL.
- **Signing out** removes your progress from that device only. It stays in your account and comes back when you sign in again.
- **Resets** in Settings apply to your account on every device.
- **Free-tier limits** (Firestore: 50,000 reads and 20,000 writes per day) are far beyond what one student uses. Each answered question costs one write.

### Troubleshooting

| Message | Fix |
| --- | --- |
| "This site's domain isn't authorised…" | Do step 10 for the domain shown in your browser's address bar. |
| "The database refused access…" | The rules from step 5 weren't published. Paste them again and click **Publish**. |
| "The sign-in popup was blocked…" | Allow popups for the site and click **Sign in** again. |
| No sign-in button at all | The Firebase config isn't in the build: redo step 8, then redeploy. |
