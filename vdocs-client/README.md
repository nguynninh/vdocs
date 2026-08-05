This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Lark Login Setup

Create `.env.local` from `.env.example` and fill in:

```bash
NEXT_PUBLIC_LARK_APP_ID=cli_xxxxxxxxxxxxxxxxx
NEXT_PUBLIC_LARK_REDIRECT_URI=http://192.168.31.90:3000/lark/callback
NEXT_PUBLIC_LARK_SCOPE=contact:user.base:readonly offline_access
NEXT_PUBLIC_LARK_STATE=lark_login
```

`NEXT_PUBLIC_LARK_APP_ID` is the app's unique ID from Lark Developer Console:

1. Open Lark Developer Console.
2. Select your app.
3. Go to `Credentials & Basic Info` / `凭证和基础信息`.
4. Copy the App ID (`cli_...`).

Also add the same callback URL to `Security Settings` / `安全设置` as an allowed redirect URL, then restart `npm run dev`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
