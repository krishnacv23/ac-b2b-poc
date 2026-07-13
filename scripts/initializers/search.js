import { initializers } from '@dropins/tools/initializer.js';
import {
  initialize,
  setEndpoint,
  setFetchGraphQlHeaders,
} from '@dropins/storefront-product-discovery/api.js';
import { getHeaders } from '@dropins/tools/lib/aem/configs.js';
import { initializeDropin } from './index.js';
import { CS_FETCH_GRAPHQL, fetchPlaceholders } from '../commerce.js';

/** ACCS Catalog Service requires these; fall back if config/session omitted them. */
const DEFAULT_CS_STORE_HEADERS = {
  'Magento-Store-Code': 'default',
  'Magento-Store-View-Code': 'default',
  'Magento-Website-Code': 'base',
};

/**
 * Ensures Catalog Service store headers are present on the Catalog Service
 * GraphQL client (and thus linked product-discovery). ACCS productSearch
 * fails with "Missing Magento-Store-View-Code Header" without them.
 *
 * `cb=0` on the GraphQL URL usually means getHeaders('cs') was empty at
 * endpoint setup (e.g. stale sessionStorage config) — defaults cover that.
 */
export function ensureCatalogServiceHeaders() {
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

  // Apply on the shared Catalog Service client (source of truth when linked).
  CS_FETCH_GRAPHQL.setFetchGraphQlHeaders((prev) => ({
    ...prev,
    ...headers,
  }));
  // Also via product-discovery API (forwards to CS when linked).
  setFetchGraphQlHeaders((prev) => ({
    ...prev,
    ...headers,
  }));
}

await initializeDropin(async () => {
  // Inherit Fetch GraphQL Instance (Catalog Service)
  setEndpoint(CS_FETCH_GRAPHQL);
  // Re-apply CS headers after linking — guards against race/stale clients
  // where Magento-Store-* headers were missing on productSearch.
  ensureCatalogServiceHeaders();

  // Fetch placeholders
  const labels = await fetchPlaceholders('placeholders/search.json');
  const langDefinitions = {
    default: {
      ...labels,
    },
  };

  // Initialize search
  return initializers.mountImmediately(initialize, { langDefinitions });
})();
