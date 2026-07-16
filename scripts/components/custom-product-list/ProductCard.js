import { h } from '@dropins/tools/preact.js';
import { addProductsToCart } from '@dropins/storefront-cart/api.js';
import { getProductLink, rootLink } from '../../commerce.js';
import {
  getProductImage,
  getProductPrice,
} from '../custom-product-loader/custom-product-loader.js';

const PREFIX = 'commerce-custom-product-list';

function getDetailsHref(urlKey, sku) {
  // On local drafts, route into the custom PDP draft for an end-to-end demo.
  if (window.location.pathname.includes('/drafts/')) {
    return `${rootLink('/drafts/custom-product-details')}?sku=${encodeURIComponent(sku)}`;
  }
  return getProductLink(urlKey, sku);
}

export default function ProductCard({ product, addToCartLabel }) {
  const {
    sku, urlKey, name: productName, inStock, typename,
  } = product;
  const name = productName || sku;
  const href = getDetailsHref(urlKey, sku);
  const isComplex = typename === 'ComplexProductView';
  const imageUrl = getProductImage(product);

  return h(
    'article',
    {
      className: `${PREFIX}__card${inStock ? '' : ` ${PREFIX}__card--out-of-stock`}`,
    },
    h(
      'a',
      { className: `${PREFIX}__image-link`, href },
      h('img', {
        className: `${PREFIX}__image`,
        src: imageUrl,
        alt: name,
        loading: 'lazy',
        decoding: 'async',
        width: 400,
        height: 400,
      }),
    ),
    h(
      'div',
      { className: `${PREFIX}__body` },
      h(
        'div',
        { className: `${PREFIX}__meta` },
        h('p', { className: `${PREFIX}__sku` }, sku),
        h(
          'p',
          { className: `${PREFIX}__stock ${PREFIX}__stock--${inStock ? 'in' : 'out'}` },
          inStock ? 'In Stock' : 'Out of Stock',
        ),
      ),
      h(
        'h3',
        { className: `${PREFIX}__title` },
        h('a', { href }, name),
      ),
      h(
        'div',
        { className: `${PREFIX}__footer` },
        h('p', { className: `${PREFIX}__price` }, getProductPrice(product) || ''),
        h(
          'div',
          { className: `${PREFIX}__actions` },
          h('a', { className: `${PREFIX}__btn ${PREFIX}__btn--view`, href }, 'Details'),
          !isComplex && h(
            'button',
            {
              type: 'button',
              className: `${PREFIX}__btn ${PREFIX}__btn--cart`,
              disabled: !inStock,
              onClick: () => addProductsToCart([{ sku, quantity: 1 }]),
            },
            addToCartLabel,
          ),
        ),
      ),
    ),
  );
}
