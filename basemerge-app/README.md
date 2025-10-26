This is a [Vite](https://vitejs.dev) project bootstrapped with [`@farcaster/create-mini-app`](https://github.com/farcasterxyz/miniapps/tree/main/packages/create-mini-app).

For documentation and guides, visit [miniapps.farcaster.xyz](https://miniapps.farcaster.xyz/docs/getting-started).

## Yapılandırma

Mini uygulama, Next.js tabanlı ana web sürümünü veri/asset kaynağı olarak kullanır. Aşağıdaki
ortam değişkenlerini `.env` dosyasıyla ayarlayarak farklı ortamlara yönlendirebilirsiniz:

| Değişken | Açıklama | Varsayılan |
| --- | --- | --- |
| `VITE_WEB_API_BASE` | Skor gönderimi ve liderlik tablosu için çağrılan BaseMerge web API origin’i | `https://base-merge.vercel.app` |
| `VITE_WEB_ASSET_BASE` | Token görselleri gibi statik asset’lerin alındığı origin | `https://base-merge.vercel.app` |
| `VITE_SEASON_ID` | İmzalanan skor mesajında kullanılan sezon etiketi | `season-1` |

## Base + Farcaster manifests

Both Base App and Farcaster Mini Apps read their metadata from the
`/.well-known` directory inside `public`.

- `./public/.well-known/base-app.json` exposes the Base App manifest. It reuses the
  same account association and asset URLs as the main deployment
  (`https://base-merge-basemerge-app.vercel.app`) and declares Base Mainnet
  (`eip155:8453`) as the required chain.
- `./public/.well-known/farcaster.json` keeps the Farcaster manifest in the legacy
  `frame` format that Warpcast expects today. Update this whenever you rotate the
  domain, webhook, or signature payload referenced in [miniapps.farcaster.xyz](https://miniapps.farcaster.xyz/docs/getting-started).

You can also use the `public` directory to serve static art referenced by
`splashImageUrl`, `imageUrl`, or any future assets for Base and Farcaster
listings.

## Frame Embed

Add a the `fc:frame` in `index.html` to make your root app URL sharable in feeds:

```html
  <head>
    <!--- other tags --->
    <meta name="fc:frame" content='{"version":"next","imageUrl":"https://placehold.co/900x600.png?text=Frame%20Image","button":{"title":"Open","action":{"type":"launch_frame","name":"App Name","url":"https://app.com"}}}' /> 
  </head>
```
