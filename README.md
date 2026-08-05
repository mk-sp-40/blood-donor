# Campus Blood Donor Portal

A cloud-based blood donor management system for a college campus. Students and
staff register as donors, anyone can search the directory by blood group and
eligibility, and urgent blood requests are automatically matched against
compatible, eligible donors.

## Tech stack

| Layer            | Technology                                             |
|-------------------|---------------------------------------------------------|
| Frontend          | React 18 (functional components + hooks)                |
| Icons             | lucide-react                                             |
| Styling           | Tailwind CSS (CDN build)                                 |
| Backend logic     | Service-layer modules (`DonorService`, `RequestService`) |
| Data storage       | Cloud key-value storage (`window.storage`, shared)       |
| Build tool         | Vite                                                     |

## Project structure

```
campus-blood-donor-portal/
├── index.html            # Vite entry HTML (loads Tailwind CDN)
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx           # React entry point
    ├── App.jsx            # All app code: components + service layer
    └── storagePolyfill.js # localStorage shim for running outside Claude
```

## Running locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## How the "cloud storage" works

Inside Claude's artifact preview, `window.storage` is provided automatically
and persists donor and request records in the cloud, shared across every
visitor. Outside that environment, `src/storagePolyfill.js` backs the same
API with the browser's `localStorage`, so the project still runs and can be
demoed on its own — just note that data then stays local to that one browser
instead of being shared with other users.

`DonorService` and `RequestService` in `App.jsx` are the only places that
talk to storage. To move this to a real production backend (Firebase
Firestore, MongoDB Atlas, a custom Express API, etc.), you only need to
rewrite those two service objects — the rest of the app doesn't need to
change.

## Data model

**Donor record** — `id`, `name`, `studentId`, `bloodGroup`, `department`,
`phone`, `email`, `lastDonationDate`, `registeredAt`.

**Blood request record** — `id`, `patientName`, `bloodGroup`, `units`,
`hospital`, `contactPhone`, `urgency`, `status`, `postedAt`.

## Core features

- Donor registration with validation and instant directory listing
- Eligibility engine (90-day minimum gap between donations, computed live)
- Blood-group compatibility matching between requests and donors
- Searchable/filterable donor directory
- Urgent blood request board with fulfil/close workflow

## Future scope

- Authenticated accounts so contact details are only shown after verification
- Notifications (SMS/email) when a compatible request is posted
- Production-grade managed database
- Admin dashboard for campus health services
