# client

React 19 + Vite operator dashboard for ODERP-ly. TypeScript, Tailwind CSS, Socket.io client.

## Structure

```
client/
├── src/
│   ├── main.tsx                    # App entry point
│   ├── App.tsx                     # Router setup (React Router v7)
│   ├── pages/
│   │   ├── login/                  # Login page (email + password → JWT)
│   │   ├── dashboard/              # Operator control room (live panic feed)
│   │   ├── panic-detail/           # Single panic view (actions + audit log)
│   │   └── not-found/              # 404 fallback
│   ├── components/
│   │   ├── protected-route/        # ProtectedRoute.tsx — JWT guard for authenticated pages
│   │   ├── panic-feed/             # PanicFeed.tsx — live list of active panics
│   │   ├── panic-card/             # PanicCard.tsx — individual panic summary card
│   │   ├── panic-actions/          # PanicActions.tsx — acknowledge/dispatch/resolve buttons
│   │   └── audit-log/              # AuditLog.tsx — paginated status change history
│   └── hooks/
│       ├── useAuth.ts              # JWT storage and auth state
│       ├── usePanics.ts            # Panic list data fetching + Socket.io subscription
│       └── usePanic.ts             # Single panic data fetching + Socket.io subscription
└── tests/                          # Vitest test files (29 tests)
```

## Scripts

```bash
npm run dev      # Vite dev server — http://localhost:5173 (proxies /api to port 3000)
npm run build    # Production build → dist/
npm run preview  # Serve production build locally
npm test         # Vitest
```

## Real-time updates

The dashboard and panic detail pages subscribe to Socket.io events from the API (`panic:new`, `panic:updated`). Authentication is performed at the Socket.io handshake using the operator's JWT. No polling — the UI updates instantly when a partner submits or claims a panic, or when an operator advances the status.
