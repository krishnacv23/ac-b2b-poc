# Commerce Custom Product Details

Custom product detail page (PDP) that uses the storefront PDP **API** (`fetchProductData`) with a Preact UI — same pattern as `commerce-custom-product-list`.

## Authoring

Key-value fields:

| Field | Purpose |
|-------|---------|
| `sku` | Product SKU (preferred) |
| `defaultSku` | Fallback for UE template pages |
| `backHref` | Catalog back link |

SKU resolution order: block `sku` → `defaultSku` → `?sku=` → URL `/products/{urlKey}/{sku}`.

## Local draft

```bash
npm run start:drafts
```

Open:

- Catalog: http://localhost:3000/drafts/custom-products
- Detail: http://localhost:3000/drafts/custom-product-details?sku=YOUR_SKU

From the custom catalog, **Details** links to the custom PDP draft when browsing under `/drafts/`.
