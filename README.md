# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/4fecdfea-6606-4c1c-941c-decc83578cba

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4fecdfea-6606-4c1c-941c-decc83578cba) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Configure environment variables
# Copy .env.example to .env and add your IMF API key
cp .env.example .env
# Then edit .env and set: IMF_API_KEY=your-actual-key-here

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## IMF API Configuration

This project uses the International Monetary Fund (IMF) Data API to fetch economic indicators.

### Getting Your API Key

1. Visit the [IMF API Portal](https://data.imf.org/en/Resource-Pages/IMF-API)
2. Sign up for a free account
3. Navigate to your profile/subscription page
4. Copy your `Ocp-Apim-Subscription-Key`
5. Add it to your `.env` file:
   ```
   IMF_API_KEY=your-subscription-key-here
   ```

### Supported Endpoints

The server handler (`server/api/imf3.ts`) supports:

- **Data requests**: Fetch time-series economic data
  ```
  /api/imf3?type=data&flowRef=WEO&key=RUS.NGDPD&startPeriod=2020&endPeriod=2025
  ```

- **Availability checks**: Query available series for a dataset
  ```
  /api/imf3?type=availableconstraint&flowRef=CPI&key=ALL&componentID=REF_AREA
  ```

### Key Formats

SDMX keys follow dataset-specific structures. Common patterns:
- WEO (World Economic Outlook): `{COUNTRY_CODE}.{INDICATOR}` (e.g., `US.NGDPD`)
- IFS (International Financial Statistics): `{FREQ}.{COUNTRY_CODE}.{INDICATOR}` (e.g., `A.US.NGDP_R_SA_IX`)

The server automatically tries multiple variants (2-letter vs 3-letter codes, with/without frequency) to maximize data retrieval success.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4fecdfea-6606-4c1c-941c-decc83578cba) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
