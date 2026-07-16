import {
  setEndpoint,
  fetchProductData,
  getRefinedProduct,
} from '@dropins/storefront-pdp/api.js';
import { applyCatalogServiceHeaders } from '../../helpers/catalog-service-headers.js';
import { CS_FETCH_GRAPHQL } from '../../commerce.js';

const priceFormatterCache = new Map();
let pdpClientReady = false;

function formatPrice(amount, currency = 'USD') {
  if (amount == null) return null;
  if (!priceFormatterCache.has(currency)) {
    priceFormatterCache.set(
      currency,
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
      }),
    );
  }
  return priceFormatterCache.get(currency).format(amount);
}

export function ensurePdpClient() {
  if (pdpClientReady) return;
  setEndpoint(CS_FETCH_GRAPHQL);
  applyCatalogServiceHeaders();
  pdpClientReady = true;
}

export async function loadProductDetail({ sku, optionsUIDs } = {}) {
  if (!sku) {
    throw new Error('Product SKU is required');
  }

  ensurePdpClient();

  return fetchProductData(sku, {
    optionsUIDs,
    skipTransform: true,
    preselectFirstOption: true,
  });
}

export async function refineProductDetail(sku, optionsUIDs = []) {
  if (!sku) {
    throw new Error('Product SKU is required');
  }

  ensurePdpClient();
  return getRefinedProduct(sku, optionsUIDs);
}

export function getDetailPrice(product) {
  const final = product?.prices?.final;
  const regular = product?.prices?.regular;
  const amount = final?.amount ?? regular?.amount;
  const currency = final?.currency || regular?.currency || 'USD';
  return formatPrice(amount, currency);
}

export function getDetailRegularPrice(product) {
  const final = product?.prices?.final;
  const regular = product?.prices?.regular;
  if (
    regular?.amount == null
    || final?.amount == null
    || regular.amount <= final.amount
  ) {
    return null;
  }
  return formatPrice(regular.amount, regular.currency || final.currency || 'USD');
}

export function getDetailImageUrl(image) {
  const url = image?.url || '';
  if (!url) return '';
  return url.startsWith('//') ? `https:${url}` : url;
}

export function getInitialOptionUIDs(product) {
  if (!product?.options?.length) return [];

  return product.options
    .map((option) => {
      const selected = option.items?.find((item) => item.selected);
      if (selected?.id) return selected.id;
      const inStock = option.items?.find((item) => item.inStock);
      return inStock?.id || option.items?.[0]?.id;
    })
    .filter(Boolean);
}

export function mergeRefinedProduct(prev, refined) {
  if (!refined) {
    return { product: prev, imagesUnchanged: true };
  }

  const imagesUnchanged = Boolean(
    refined.images?.length
    && prev?.images?.length
    && refined.images[0]?.url === prev.images[0]?.url,
  );

  return {
    product: {
      ...prev,
      ...refined,
      options: refined.options?.length ? refined.options : prev.options,
      images: refined.images?.length ? refined.images : prev.images,
      description: refined.description || prev.description,
      shortDescription: refined.shortDescription || prev.shortDescription,
      attributes: refined.attributes?.length ? refined.attributes : prev.attributes,
    },
    imagesUnchanged,
  };
}
