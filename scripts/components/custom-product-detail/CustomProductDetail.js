import { h } from '@dropins/tools/preact.js';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from '@dropins/tools/preact-hooks.js';
import { addProductsToCart } from '@dropins/storefront-cart/api.js';
import { IS_DA, IS_UE, loadErrorPage } from '../../commerce.js';
import {
  loadProductDetail,
  refineProductDetail,
  getDetailPrice,
  getDetailRegularPrice,
  getDetailImageUrl,
  getInitialOptionUIDs,
  mergeRefinedProduct,
} from '../custom-product-detail-loader/custom-product-detail-loader.js';

const PREFIX = 'commerce-custom-product-details';

function stripHtml(html) {
  if (!html) return '';
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.textContent?.trim() || '';
}

async function fetchWithRetry(sku, optionsUIDs, attemptsLeft = 2) {
  try {
    return await loadProductDetail({ sku, optionsUIDs });
  } catch (error) {
    if (attemptsLeft <= 1) throw error;
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    return fetchWithRetry(sku, optionsUIDs, attemptsLeft - 1);
  }
}

function Gallery({
  images, name, activeIndex, onSelect, refining,
}) {
  const active = images[activeIndex] || images[0];
  if (!active) {
    return h('div', { className: `${PREFIX}__gallery ${PREFIX}__gallery--empty` }, 'No image');
  }

  return h(
    'div',
    {
      className: `${PREFIX}__gallery${refining ? ` ${PREFIX}__gallery--refining` : ''}`,
    },
    h('img', {
      className: `${PREFIX}__hero-image`,
      src: getDetailImageUrl(active),
      alt: active.label || name,
      width: active.width || 800,
      height: active.height || 800,
      fetchpriority: 'high',
      decoding: 'async',
    }),
    images.length > 1 && h(
      'div',
      { className: `${PREFIX}__thumbs`, role: 'list' },
      images.map((image, index) => h(
        'button',
        {
          type: 'button',
          key: image.url || index,
          className: `${PREFIX}__thumb${index === activeIndex ? ` ${PREFIX}__thumb--active` : ''}`,
          'aria-label': `View image ${index + 1}`,
          'aria-current': index === activeIndex ? 'true' : undefined,
          onClick: () => onSelect(index),
        },
        h('img', {
          src: getDetailImageUrl(image),
          alt: image.label || `${name} thumbnail ${index + 1}`,
          width: 72,
          height: 72,
          loading: 'lazy',
          decoding: 'async',
        }),
      )),
    ),
  );
}

function OptionGroup({
  option, selectedId, onSelect, disabled,
}) {
  return h(
    'fieldset',
    { className: `${PREFIX}__option`, disabled },
    h('legend', { className: `${PREFIX}__option-label` }, option.label),
    h(
      'div',
      { className: `${PREFIX}__option-values` },
      (option.items || []).map((item) => {
        const selected = item.id === selectedId;
        const swatchStyle = option.type === 'color' && item.value
          ? { backgroundColor: item.value }
          : undefined;

        return h(
          'button',
          {
            type: 'button',
            key: item.id,
            className: [
              `${PREFIX}__option-value`,
              selected ? `${PREFIX}__option-value--selected` : '',
              !item.inStock ? `${PREFIX}__option-value--disabled` : '',
              option.type === 'color' ? `${PREFIX}__option-value--swatch` : '',
            ].filter(Boolean).join(' '),
            disabled: disabled || !item.inStock,
            'aria-pressed': selected,
            title: item.label,
            style: swatchStyle,
            onClick: () => onSelect(option.id, item.id),
          },
          option.type === 'color' ? h('span', { className: `${PREFIX}__sr-only` }, item.label) : item.label,
        );
      }),
    ),
  );
}

function Attributes({ attributes }) {
  const visible = useMemo(
    () => (attributes || []).filter((attr) => attr.label && attr.value),
    [attributes],
  );
  if (!visible.length) return null;

  return h(
    'div',
    { className: `${PREFIX}__attributes` },
    h('h2', { className: `${PREFIX}__section-title` }, 'Specifications'),
    h(
      'dl',
      { className: `${PREFIX}__attr-list` },
      visible.map((attr) => h(
        'div',
        { key: attr.id || attr.label, className: `${PREFIX}__attr-row` },
        h('dt', null, attr.label),
        h('dd', null, attr.value),
      )),
    ),
  );
}

export default function CustomProductDetail({
  block,
  sku,
  addToCartLabel,
  backHref,
}) {
  const [loadState, setLoadState] = useState('loading');
  const [status, setStatus] = useState('Loading product...');
  const [product, setProduct] = useState(null);
  const [selectedUIDs, setSelectedUIDs] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [cartState, setCartState] = useState('idle');
  const [cartMessage, setCartMessage] = useState('');
  const [refining, setRefining] = useState(false);

  const refineRequestId = useRef(0);
  const addInFlight = useRef(false);
  const selectedUidSet = useMemo(() => new Set(selectedUIDs), [selectedUIDs]);

  const shortText = useMemo(
    () => stripHtml(product?.shortDescription),
    [product?.shortDescription],
  );
  const descriptionText = useMemo(
    () => stripHtml(product?.description),
    [product?.description],
  );
  const price = useMemo(() => getDetailPrice(product), [product]);
  const regularPrice = useMemo(() => getDetailRegularPrice(product), [product]);

  useEffect(() => {
    let active = true;

    if (!sku) {
      setLoadState('error');
      setStatus('No product SKU provided. Set sku on the block or use /products/{urlKey}/{sku}.');
      return undefined;
    }

    setLoadState('loading');
    setStatus('Loading product...');
    setProduct(null);
    setCartMessage('');
    setCartState('idle');

    fetchWithRetry(sku)
      .then((result) => {
        if (!active) return;
        if (!result?.sku) {
          if (sku && !IS_UE && !IS_DA) {
            loadErrorPage();
            return;
          }
          setProduct(null);
          setLoadState('empty');
          setStatus(`Product "${sku}" was not found.`);
          return;
        }
        setProduct(result);
        setSelectedUIDs(getInitialOptionUIDs(result));
        setImageIndex(0);
        setLoadState('ready');
        setStatus('');
      })
      .catch((error) => {
        if (!active) return;
        console.error('Custom product details failed to load', error);
        setProduct(null);
        setLoadState('error');
        setStatus(`Unable to load product. ${error?.message || error}`);
      });

    return () => {
      active = false;
    };
  }, [sku]);

  useEffect(() => {
    if (!block) return;
    block.classList.toggle(`${PREFIX}--empty`, loadState === 'empty');
    block.classList.toggle(`${PREFIX}--error`, loadState === 'error');
    block.classList.toggle(`${PREFIX}--loading`, loadState === 'loading');
  }, [block, loadState]);

  const handleOptionSelect = async (optionId, valueId) => {
    if (!product || refining) return;
    if (selectedUidSet.has(valueId)) return;

    const nextUIDs = (product.options || []).map((option) => {
      if (option.id === optionId) return valueId;
      const current = option.items?.find((item) => selectedUidSet.has(item.id));
      return current?.id;
    }).filter(Boolean);

    setSelectedUIDs(nextUIDs);
    setCartMessage('');
    setCartState('idle');

    const requestId = refineRequestId.current + 1;
    refineRequestId.current = requestId;
    setRefining(true);

    try {
      const refined = await refineProductDetail(product.sku, nextUIDs);
      // Ignore stale responses from rapid option clicks.
      if (requestId !== refineRequestId.current) return;
      if (!refined?.sku) return;

      const { product: merged, imagesUnchanged } = mergeRefinedProduct(product, refined);
      setProduct(merged);
      if (!imagesUnchanged) {
        setImageIndex(0);
      }
    } catch (error) {
      if (requestId !== refineRequestId.current) return;
      console.warn('Option refine failed', error);
    } finally {
      if (requestId === refineRequestId.current) {
        setRefining(false);
      }
    }
  };

  const handleAddToCart = () => {
    if (!product?.sku || addInFlight.current) return;

    const requiredOptions = (product.options || []).filter((option) => option.required);
    const missingRequired = requiredOptions.some(
      (option) => !option.items?.some((item) => selectedUidSet.has(item.id)),
    );
    if (missingRequired) {
      setCartMessage('Please select all required options.');
      return;
    }

    const payload = {
      sku: product.sku,
      quantity,
    };
    if (selectedUIDs.length) {
      payload.optionsUIDs = selectedUIDs;
    }

    addInFlight.current = true;
    setCartState('added');
    setCartMessage('Added to cart.');

    addProductsToCart([payload])
      .catch((error) => {
        console.error('Add to cart failed', error);
        setCartState('idle');
        setCartMessage(error?.message || 'Unable to add to cart.');
      })
      .finally(() => {
        addInFlight.current = false;
      });
  };

  if (loadState === 'loading') {
    return h(
      'div',
      {
        className: `${PREFIX}__wrapper`,
        'aria-busy': 'true',
        'aria-live': 'polite',
      },
      h(
        'div',
        { className: `${PREFIX}__skeleton`, 'aria-hidden': 'true' },
        h('div', { className: `${PREFIX}__skeleton-media` }),
        h(
          'div',
          { className: `${PREFIX}__skeleton-copy` },
          h('div', { className: `${PREFIX}__skeleton-line` }),
          h('div', { className: `${PREFIX}__skeleton-line ${PREFIX}__skeleton-line--short` }),
          h('div', { className: `${PREFIX}__skeleton-line ${PREFIX}__skeleton-line--price` }),
        ),
      ),
      h('p', { className: `${PREFIX}__status ${PREFIX}__status--sr` }, status),
    );
  }

  if (loadState === 'empty' || loadState === 'error' || !product) {
    return h(
      'div',
      { className: `${PREFIX}__wrapper ${PREFIX}__wrapper--message` },
      h('p', { className: `${PREFIX}__status` }, status),
      backHref && h('a', { className: `${PREFIX}__back`, href: backHref }, '← Back to catalog'),
    );
  }

  const images = product.images || [];
  const canAdd = product.addToCartAllowed !== false
    && product.inStock !== false;

  return h(
    'div',
    { className: `${PREFIX}__wrapper` },
    h(
      'div',
      { className: `${PREFIX}__header` },
      h('p', { className: `${PREFIX}__eyebrow` }, 'Product Detail'),
      backHref && h('a', { className: `${PREFIX}__back ${PREFIX}__back--header`, href: backHref }, '← Catalog'),
    ),
    h(
      'div',
      { className: `${PREFIX}__layout` },
      h(Gallery, {
        images,
        name: product.name,
        activeIndex: imageIndex,
        onSelect: setImageIndex,
        refining,
      }),
      h(
        'div',
        { className: `${PREFIX}__info` },
        h(
          'div',
          { className: `${PREFIX}__meta` },
          h('p', { className: `${PREFIX}__sku` }, product.sku),
          h(
            'p',
            {
              className: `${PREFIX}__stock ${PREFIX}__stock--${product.inStock ? 'in' : 'out'}`,
            },
            product.inStock ? 'In Stock' : 'Out of Stock',
          ),
        ),
        h('h1', { className: `${PREFIX}__title` }, product.name),
        h(
          'div',
          { className: `${PREFIX}__price-row${refining ? ` ${PREFIX}__price-row--refining` : ''}` },
          h('p', { className: `${PREFIX}__price` }, price || ''),
          regularPrice && h('p', { className: `${PREFIX}__price-regular` }, regularPrice),
        ),
        shortText && h('p', { className: `${PREFIX}__short` }, shortText),
        (product.options || []).map((option) => {
          const selectedId = option.items?.find((item) => selectedUidSet.has(item.id))?.id;
          return h(OptionGroup, {
            key: option.id,
            option,
            selectedId,
            disabled: refining,
            onSelect: handleOptionSelect,
          });
        }),
        h(
          'div',
          { className: `${PREFIX}__purchase` },
          h(
            'label',
            { className: `${PREFIX}__qty` },
            h('span', null, 'Qty'),
            h('input', {
              type: 'number',
              min: 1,
              max: 999,
              value: quantity,
              inputMode: 'numeric',
              onInput: (event) => {
                const next = parseInt(event.target.value, 10);
                setQuantity(Number.isFinite(next) && next > 0 ? Math.min(next, 999) : 1);
              },
            }),
          ),
          h(
            'button',
            {
              type: 'button',
              className: `${PREFIX}__btn ${PREFIX}__btn--cart`,
              disabled: !canAdd,
              onClick: handleAddToCart,
            },
            addToCartLabel,
          ),
        ),
        cartMessage && h(
          'p',
          {
            className: `${PREFIX}__cart-message${cartState === 'added' ? ` ${PREFIX}__cart-message--ok` : ''}`,
            role: 'status',
          },
          cartMessage,
        ),
      ),
    ),
    descriptionText && h(
      'div',
      { className: `${PREFIX}__description` },
      h('h2', { className: `${PREFIX}__section-title` }, 'Description'),
      h('p', null, descriptionText),
    ),
    h(Attributes, { attributes: product.attributes }),
  );
}
