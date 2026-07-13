import { h } from '@dropins/tools/preact.js';
import { useEffect, useState } from '@dropins/tools/preact-hooks.js';
import { loadProducts } from '../custom-product-loader/custom-product-loader.js';
import ProductCard from './ProductCard.js';

const PREFIX = 'commerce-custom-product-list';

function getStatusMessage(count, phrase) {
  return phrase ? `${count} products found for "${phrase}".` : `${count} products found.`;
}

export default function CustomProductList({
  block,
  title,
  phrase,
  pageSize,
  categoryPath,
  addToCartLabel,
}) {
  const [status, setStatus] = useState('Loading products...');
  const [products, setProducts] = useState([]);
  const [loadState, setLoadState] = useState('loading');

  useEffect(() => {
    let active = true;

    loadProducts({
      phrase, pageSize, currentPage: 1, categoryPath,
    })
      .then((result) => {
        if (!active) return;

        const count = result?.totalCount || 0;
        const items = result?.items || [];

        setProducts(items);
        setStatus(getStatusMessage(count, phrase));
        setLoadState(count === 0 ? 'empty' : 'ready');
      })
      .catch((error) => {
        if (!active) return;

        console.error('Custom product list failed to load products', error);
        setProducts([]);
        setStatus('Unable to load products. Check commerce config and GraphQL access.');
        setLoadState('error');
      });

    return () => {
      active = false;
    };
  }, [phrase, pageSize, categoryPath]);

  useEffect(() => {
    if (!block) return;

    block.classList.toggle(`${PREFIX}--empty`, loadState === 'empty');
    block.classList.toggle(`${PREFIX}--error`, loadState === 'error');
  }, [block, loadState]);

  return h(
    'div',
    { className: `${PREFIX}__wrapper` },
    h(
      'div',
      { className: `${PREFIX}__header` },
      h('p', { className: `${PREFIX}__eyebrow` }, 'Procurement Catalog'),
      h('h2', { className: `${PREFIX}__heading` }, title),
      h('p', { className: `${PREFIX}__status` }, status),
    ),
    loadState !== 'empty' && loadState !== 'error' && h(
      'div',
      { className: `${PREFIX}__grid`, role: 'list' },
      products.map((product) => h(ProductCard, {
        key: product.sku,
        product,
        addToCartLabel,
      })),
    ),
  );
}
