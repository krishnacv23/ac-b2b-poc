import { getHeaders } from '@dropins/tools/lib/aem/configs.js';
import { CS_FETCH_GRAPHQL } from '../commerce.js';

/** ACCS Catalog Service requires these; fall back if config/session omitted them. */
export const DEFAULT_CS_STORE_HEADERS = {
  'Magento-Store-Code': 'default',
  'Magento-Store-View-Code': 'default',
  'Magento-Website-Code': 'base',
};

/**
 * Applies Magento-Store-* headers on the shared Catalog Service GraphQL client.
 * Safe to call repeatedly; does not initialize product-discovery or search drop-ins.
 * @returns {Record<string, string>} Headers that were applied
 */
export function applyCatalogServiceHeaders() {
  let csHeaders = {};
  try {
    csHeaders = getHeaders('cs') || {};
  } catch {
    // Config not initialized yet; use defaults below.
  }

  const headers = {
    ...DEFAULT_CS_STORE_HEADERS,
    ...csHeaders,
  };

  CS_FETCH_GRAPHQL.setFetchGraphQlHeaders((prev) => ({
    ...prev,
    ...headers,
  }));

  return headers;
}
