import { initializers } from '@dropins/tools/initializer.js';
import {
  initialize,
  setEndpoint,
  setFetchGraphQlHeaders,
} from '@dropins/storefront-product-discovery/api.js';
import { initializeDropin } from './index.js';
import { CS_FETCH_GRAPHQL, fetchPlaceholders } from '../commerce.js';
import { applyCatalogServiceHeaders } from '../helpers/catalog-service-headers.js';

/**
 * Ensures Catalog Service store headers are present on the Catalog Service
 * GraphQL client and the linked product-discovery client.
 */
export function ensureCatalogServiceHeaders() {
  const headers = applyCatalogServiceHeaders();
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
