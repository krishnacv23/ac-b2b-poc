import { search } from '@dropins/storefront-product-discovery/api.js';

const VISIBILITY_FILTER = {
  attribute: 'visibility',
  in: ['Search', 'Catalog, Search'],
};

const priceFormatterCache = new Map();

function formatPrice(amount) {
  const currency = amount.currency || 'USD';
  if (!priceFormatterCache.has(currency)) {
    priceFormatterCache.set(
      currency,
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
      }),
    );
  }
  return priceFormatterCache.get(currency).format(amount.value);
}

function getPriceAmount(product) {
  return (
    product?.price?.final?.amount
    || product?.price?.regular?.amount
    || product?.priceRange?.minimum?.final?.amount
    || product?.priceRange?.minimum?.regular?.amount
  );
}

export async function loadProducts({
  phrase = '',
  pageSize = 12,
  currentPage = 1,
  categoryPath,
} = {}) {
  const filter = [VISIBILITY_FILTER];
  if (categoryPath) filter.push({ attribute: 'categoryPath', eq: categoryPath });

  return search({
    phrase,
    pageSize,
    currentPage,
    filter,
    sort: [],
  });
}

export function getProductPrice(product) {
  const amount = getPriceAmount(product);
  return amount?.value ? formatPrice(amount) : null;
}

export function getProductImage(product) {
  const url = product?.images?.[0]?.url;
  if (!url) return '';
  return url.startsWith('//') ? `https:${url}` : url;
}
