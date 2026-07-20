# SMS Reply

Public one-time reply page for GeorgeTech SMS Portal.

## Local Development

```powershell
npm.cmd install
npm.cmd run dev
```

## Build

```powershell
npm.cmd run build
```

## Production

Configured domain:

```text
sms.georgetech.uk
```

Set the SMS Portal setting `Reply page URL` to:

```text
https://sms.georgetech.uk
```

The page calls these Supabase Edge Functions:

- `sms-reply-link-get`
- `sms-reply-link-send`

Both functions must be deployed with `--no-verify-jwt`.
