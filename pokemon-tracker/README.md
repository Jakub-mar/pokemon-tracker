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

## Účty

Registrovaný uživatel může po přihlášení otevřít **Moje konto** a změnit zobrazované jméno nebo heslo. Přihlašovací relace je uložena v HttpOnly cookie; při odhlášení se zneplatní na serveru. Pro lokální běh se relace ukládají do `data/sessions.json`, který se do Gitu nepřidává.
Při nasazení na více instancí nebo serverless platformu je potřeba uživatele i relace přesunout do sdíleného databázového úložiště.

Přihlášený admin najde na stránce **Administrace** seznam uživatelů. Může upravit zobrazované jméno, změnit roli, účet zablokovat nebo smazat. Změny jsou kontrolované také na serveru; poslední admin ani vlastní účet nelze smazat nebo zablokovat.

### Přihlášení přes Google

1. V Google Cloud Console vytvoř OAuth klienta typu **Web application** a přidej do jeho autorizovaných přesměrovacích URI:
   `http://localhost:3000/api/auth/callback/google` (lokální vývoj) a callback URL produkční aplikace.
2. Zkopíruj `.env.example` do `.env.local` a vyplň `GOOGLE_CLIENT_ID` a `GOOGLE_CLIENT_SECRET`.
3. `GOOGLE_REDIRECT_URI` můžeš nechat prázdné; aplikace pak použije `NEXTAUTH_URL` a callback `/api/auth/callback/google`. Pokud ho nastavíš, musí přesně odpovídat URL registrované v Google Cloud Console.
4. Restartuj vývojový server.

Stejné proměnné nastav také v prostředí nasazené aplikace. Účet vytvořený přes Google se založí automaticky při prvním přihlášení; pokud už v aplikaci existuje účet se stejným ověřeným e-mailem, přihlášení přes Google se napojí na tento účet.

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
