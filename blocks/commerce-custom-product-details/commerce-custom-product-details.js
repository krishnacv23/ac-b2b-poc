import { h, render } from '@dropins/tools/preact.js';
import { loadCSS, readBlockConfig } from '../../scripts/aem.js';
import {
  fetchPlaceholders,
  getProductSku,
  rootLink,
} from '../../scripts/commerce.js';
import CustomProductDetail from '../../scripts/components/custom-product-detail/CustomProductDetail.js';

function resolveSku(config) {
  return (
    config.sku
    || config.defaultsku
    || new URLSearchParams(window.location.search).get('sku')
    || getProductSku()
    || ''
  );
}

// Default catalog page for the "Back to Products" link when none is authored.
const DEFAULT_CATALOG_PATH = '/products';

function resolveBackHref(config) {
  if (config.backhref) return config.backhref;
  if (window.location.pathname.includes('/drafts/')) {
    return rootLink('/drafts/custom-products');
  }
  return rootLink(DEFAULT_CATALOG_PATH);
}

export default async function decorate(block) {
  await Promise.all([
    loadCSS(`${window.hlx.codeBasePath}/scripts/components/custom-catalog/custom-catalog.css`),
    import('../../scripts/initializers/cart.js'),
  ]);

  const [labels, config] = await Promise.all([
    fetchPlaceholders(),
    Promise.resolve(readBlockConfig(block)),
  ]);

  const sku = resolveSku(config);
  const addToCartLabel = labels.Global?.AddProductToCart || 'Add to Cart';
  const backHref = resolveBackHref(config);

  block.replaceChildren();
  const root = document.createElement('div');
  block.append(root);

  render(
    h(CustomProductDetail, {
      block,
      sku,
      addToCartLabel,
      backHref,
    }),
    root,
  );
}
