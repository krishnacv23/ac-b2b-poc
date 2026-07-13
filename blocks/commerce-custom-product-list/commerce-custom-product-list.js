import { h, render } from '@dropins/tools/preact.js';
import { readBlockConfig } from '../../scripts/aem.js';
import { fetchPlaceholders } from '../../scripts/commerce.js';
import CustomProductList from '../../scripts/components/custom-product-list/CustomProductList.js';

import '../../scripts/initializers/search.js';
import '../../scripts/initializers/cart.js';

export default async function decorate(block) {
  const [labels, config] = await Promise.all([
    fetchPlaceholders(),
    Promise.resolve(readBlockConfig(block)),
  ]);

  const pageSize = parseInt(config.pagesize, 10) || 12;
  const title = config.title || 'Custom Product List';
  const phrase = config.phrase || new URLSearchParams(window.location.search).get('q') || '';
  const categoryPath = config.urlpath || '';
  const addToCartLabel = labels.Global?.AddProductToCart || 'Add to Cart';

  block.replaceChildren();
  const root = document.createElement('div');
  block.append(root);

  render(
    h(CustomProductList, {
      block,
      title,
      phrase,
      pageSize,
      categoryPath,
      addToCartLabel,
    }),
    root,
  );
}
