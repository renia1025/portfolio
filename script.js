function renderGallery() {
  const gallery = document.getElementById('detailGallery');
  if (!gallery || !window.galleryData) return;
  const groupCache = new WeakMap();
  const naturalSorter = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  function sortByPathNumber(a, b) {
    return naturalSorter.compare(a.src || a.title || '', b.src || b.title || '');
  }

  function sortedGroups(module) {
    if (groupCache.has(module)) return groupCache.get(module);
    const groups = [...module.groups]
      .sort((a, b) => {
        const aIsHeavy = /ai\s*video|video/i.test(a.title) || a.items.some((item) => item.type === 'video');
        const bIsHeavy = /ai\s*video|video/i.test(b.title) || b.items.some((item) => item.type === 'video');
        if (aIsHeavy !== bIsHeavy) return aIsHeavy ? 1 : -1;
        return naturalSorter.compare(a.title, b.title);
      })
      .map((group) => ({
        ...group,
        items: [...group.items].sort(sortByPathNumber)
      }));
    groupCache.set(module, groups);
    return groups;
  }

  function countItems(module) {
    return module.groups.reduce((total, group) => total + group.items.length, 0);
  }

  function coverFor(module) {
    if (module.title === 'RAILIA 视觉设计') {
      return 'railia-visual/2-website-banners/1.jpg';
    }
    if (module.title === '汤臣倍健电商视觉') {
      return 'optimized-assets/by-health/1-KV/kv.jpg';
    }
    const firstGroup = module.groups.find((group) => group.items.length);
    const firstImage = firstGroup && firstGroup.items.find((item) => item.type === 'image');
    const firstItem = firstImage || (firstGroup && firstGroup.items[0]);
    return firstItem ? firstItem.src : '';
  }

  function renderMediaCard(item, label) {
    return `
      <a class="detail-card is-loading ${item.type === 'video' ? 'is-video' : ''}" href="${item.src}" data-type="${item.type}">
        ${item.type === 'video'
          ? `<video src="${item.src}" muted playsinline preload="metadata"></video>`
          : `<img src="${item.src}" alt="${item.title}" loading="lazy" decoding="async">`}
        <span>${label || item.title}</span>
      </a>
    `;
  }

  function groupKey(moduleTitle, groupTitle) {
    return `${moduleTitle}::${groupTitle}`;
  }

  function renderWaterfall(items, labelPrefix, key) {
    const safeItems = items.filter(Boolean);
    if (!safeItems.length) return '';
    const columns = [[], [], []];
    safeItems.forEach((item, index) => {
      columns[index % columns.length].push(item);
    });

    return `
      <div class="detail-waterfall" data-group-key="${key}" data-total="${safeItems.length}">
        ${columns.map((columnItems) => `
          <div class="detail-waterfall-column">
            ${columnItems.map((item) => renderMediaCard(item, `${labelPrefix} / ${item.title}`)).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  function runWhenIdle(callback) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 800 });
    } else {
      window.setTimeout(callback, 32);
    }
  }

  function setupVideoPosters(root = gallery) {
    root.querySelectorAll('.detail-card video:not([data-poster-ready])').forEach((video) => {
      video.dataset.posterReady = 'pending';
      const seekPreviewFrame = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        video.currentTime = Math.min(0.15, Math.max(video.duration - 0.05, 0));
      };
      video.addEventListener('loadedmetadata', seekPreviewFrame, { once: true });
      video.addEventListener('seeked', () => {
        video.dataset.posterReady = 'true';
        video.closest('.detail-card')?.classList.remove('is-loading');
      }, { once: true });
      if (video.readyState >= 1) seekPreviewFrame();
    });
  }

  function setupMediaSkeletons(root = gallery) {
    root.querySelectorAll('.detail-card img').forEach((image) => {
      const card = image.closest('.detail-card');
      if (!card) return;
      if (image.complete && image.naturalWidth > 0) {
        card.classList.remove('is-loading');
        return;
      }
      image.addEventListener('load', () => {
        card.classList.remove('is-loading');
      }, { once: true });
      image.addEventListener('error', () => {
        card.classList.remove('is-loading');
        card.classList.add('is-error');
      }, { once: true });
    });

    root.querySelectorAll('.detail-card video').forEach((video) => {
      const card = video.closest('.detail-card');
      if (!card) return;
      if (video.readyState >= 2 || video.dataset.posterReady === 'true') {
        card.classList.remove('is-loading');
      }
      video.addEventListener('loadeddata', () => {
        card.classList.remove('is-loading');
      }, { once: true });
      video.addEventListener('error', () => {
        card.classList.remove('is-loading');
        card.classList.add('is-error');
      }, { once: true });
    });
  }

  function renderRailiaUiCase(module) {
    const groups = sortedGroups(module);
    const homeGroup = groups[0] || { items: [] };
    const functionGroup = groups[1] || { items: [] };
    const home = homeGroup.items.find((item) => item.src.includes('/home.jpg')) || homeGroup.items[0];
    const homeMobile = homeGroup.items.find((item) => item.src.includes('home-mobile'));
    const detail = homeGroup.items.find((item) => item.src.includes('detail-pages.jpg'));
    const detailMobile = homeGroup.items.find((item) => item.src.includes('detail-pages-mobile'));
    const commerceItems = functionGroup.items.filter((item) => /cart|order|payment|address|after-sales/i.test(item.src));
    const serviceItems = functionGroup.items.filter((item) => /about|contact|news|service|questionnaire|railia/i.test(item.src));

    if (module.title !== 'RAILIA 官网 UI/UX 设计') return '';
    return `
      <div class="railia-case">
        <section class="railia-case-hero">
          <div class="railia-case-copy">
            <p class="case-kicker">RAILIA UI / AI 美容科技</p>
            <h3>面向 AI LED 护肤仪的响应式官网体验</h3>
            <p>RAILIA 官网系统围绕美容科技产品展开，通过高级、干净且具有科技感的界面，完成产品介绍、购买决策支持与海外电商流程承接。</p>
          </div>
          <div class="railia-case-visual">
            ${home ? renderMediaCard(home, '官网首页体验') : ''}
            ${homeMobile ? renderMediaCard(homeMobile, '移动端首页') : ''}
          </div>
        </section>

        <section class="railia-case-strip">
          <div>
            <span>职责</span>
            <strong>UI / UX 设计</strong>
          </div>
          <div>
            <span>平台</span>
            <strong>响应式官网</strong>
          </div>
          <div>
            <span>体验范围</span>
            <strong>产品、电商、服务</strong>
          </div>
          <div>
            <span>视觉调性</span>
            <strong>专业、高级、AI 科技感</strong>
          </div>
        </section>

        <section class="railia-case-section">
          <div class="railia-section-copy">
            <span>01 / 产品叙事</span>
            <h4>将设备价值转化为清晰的产品表达。</h4>
            <p>首页与详情页围绕产品功效、科技线索、设备图像与转化路径展开，帮助用户在进入购买流程前理解 RAILIA 的产品价值。</p>
          </div>
          ${renderWaterfall([detail, detailMobile], '产品叙事', groupKey(module.title, '产品叙事'))}
        </section>

        <section class="railia-case-section">
          <div class="railia-section-copy">
            <span>02 / 交易流程</span>
            <h4>在账号、购物车与订单状态中建立购买信心。</h4>
            <p>功能页面覆盖登录注册、购物车、海外支付、订单详情、地址管理与售后申请等场景，让官网能够支撑完整的购买旅程。</p>
          </div>
          ${renderWaterfall(commerceItems, '交易流程', groupKey(module.title, '交易流程'))}
        </section>

        <section class="railia-case-section">
          <div class="railia-section-copy">
            <span>03 / 品牌支持</span>
            <h4>通过服务、品牌与内容页面延展信任感。</h4>
            <p>服务页、关于页、新闻页与问卷流程共同构建设备背后的服务层，在品牌可信度与实际用户帮助之间取得平衡。</p>
          </div>
          ${renderWaterfall(serviceItems, '品牌支持', groupKey(module.title, '品牌支持'))}
        </section>
      </div>
    `;
  }

  function renderModuleContent(module) {
    const groups = sortedGroups(module);
    const moduleClass = module.title === 'RAILIA 官网 UI/UX 设计' ? 'module-panel is-railia-ui-showcase' : 'module-panel';
    return `
      <div class="${moduleClass}">
        ${groups.map((group) => `
          <section class="detail-group">
            <header class="detail-head">
              <h4>${group.title}</h4>
              <p>${group.items.length} 件作品</p>
            </header>
            ${renderWaterfall(group.items, group.title, groupKey(module.title, group.title))}
          </section>
        `).join('')}
      </div>
    `;
  }

  function renderEntry() {
    gallery.innerHTML = `
      <div class="module-accordion">
        ${window.galleryData.map((module, index) => {
          return `
            <article class="module-accordion-item">
              <button class="module-entry" type="button" data-module-index="${index}" aria-expanded="false">
                ${coverFor(module) ? `<img src="${coverFor(module)}" alt="" loading="lazy">` : ''}
                <span class="module-entry-index">${String(index + 1).padStart(2, '0')}</span>
                <strong>${module.title}</strong>
                <small>${module.groups.length} 个栏目 / ${countItems(module)} 件作品</small>
                <b>展开</b>
              </button>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  gallery.addEventListener('click', (event) => {
    const entry = event.target.closest('.module-entry');
    if (entry) {
      const index = Number(entry.dataset.moduleIndex);
      const article = entry.closest('.module-accordion-item');
      const panel = article.querySelector(':scope > .module-panel');
      const label = entry.querySelector('b');

      if (panel) {
        const oldPanel = panel;
        // 记录条目在文档中的自然位置：展开时头部是 sticky(top:0)，
        // 收起前它贴在视口顶端，用它来锚定滚动，避免收起后页面高度骤减导致跳动。
        const anchorTop = article.getBoundingClientRect().top + window.scrollY;
        const shouldAnchor = window.scrollY > anchorTop;
        // 同步暂停视频，立即停止解码，避免延迟到 idle 时才停造成卡顿。
        oldPanel.querySelectorAll('video').forEach((video) => {
          video.pause();
        });
        article.classList.remove('is-open');
        entry.setAttribute('aria-expanded', 'false');
        if (label) label.textContent = '展开';
        // 同步移除面板，让回流一次性完成、可预测，而不是拖到 idle 回调时才突然发生。
        oldPanel.remove();
        if (shouldAnchor) {
          window.scrollTo({ top: Math.max(anchorTop - 12, 0) });
        }
        window.dispatchEvent(new CustomEvent('portfolio:module-toggle'));
      } else {
        article.classList.add('is-open');
        entry.setAttribute('aria-expanded', 'true');
        if (label) label.textContent = '收起';
        window.dispatchEvent(new CustomEvent('portfolio:module-toggle'));
        article.insertAdjacentHTML('beforeend', '<div class="module-panel module-panel-loading" aria-live="polite">正在加载项目预览</div>');
        const loadingPanel = article.querySelector(':scope > .module-panel-loading');
        runWhenIdle(() => {
          if (!article.classList.contains('is-open') || !loadingPanel || !loadingPanel.isConnected) return;
          const wrapper = document.createElement('div');
          wrapper.innerHTML = renderModuleContent(window.galleryData[index]);
          const panel = wrapper.firstElementChild;
          loadingPanel.replaceWith(panel);
          setupVideoPosters(panel);
          setupMediaSkeletons(panel);
        });
        entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

  });

  renderEntry();
  setupVideoPosters();
  setupMediaSkeletons();
}

function setupLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lbCaption = document.getElementById('lightbox-caption');
  const stage = lightbox.querySelector('.lightbox-stage');
  let currentMedia = null;
  let lastFocused = null;

  function clearMedia() {
    if (currentMedia) {
      if (currentMedia.tagName === 'VIDEO') {
        currentMedia.pause();
        currentMedia.removeAttribute('src');
      }
      currentMedia.remove();
      currentMedia = null;
    }
  }

  function open(src, caption, alt, type) {
    lastFocused = document.activeElement;
    clearMedia();

    if (type === 'video') {
      currentMedia = document.createElement('video');
      currentMedia.className = 'lightbox-video';
      currentMedia.controls = true;
      currentMedia.playsInline = true;
      currentMedia.src = src;
    } else {
      currentMedia = document.createElement('img');
      currentMedia.className = 'lightbox-img';
      currentMedia.src = src;
      currentMedia.alt = alt || caption || '';
    }

    stage.insertBefore(currentMedia, lbCaption);
    lbCaption.textContent = caption || '';
    stage.scrollTop = 0;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lightbox.querySelector('.lightbox-close').focus();
  }

  function close() {
    lightbox.hidden = true;
    clearMedia();
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  document.addEventListener('click', (event) => {
    if (Date.now() < (window.__portfolioSuppressLightboxUntil || 0)) {
      event.preventDefault();
      return;
    }
    const card = event.target.closest('.detail-card');
    if (!card) return;
    event.preventDefault();
    const media = card.querySelector('img, video');
    const label = card.querySelector('span');
    open(card.getAttribute('href'), label ? label.textContent : '', media ? media.alt : '', card.dataset.type);
  });

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox || event.target === stage) close();
  });
  lightbox.querySelector('.lightbox-close').addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !lightbox.hidden) close();
  });
}

function setupReveal() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  function reveal(el, delay = 0) {
    if (!el) return;
    el.classList.add('reveal');
    if (delay) el.style.setProperty('--reveal-delay', `${delay}s`);
    io.observe(el);
  }

  document.querySelectorAll('.about .portrait-wrap, .about-copy, .skills h2, .selected-hero, .work-intro, .skills-mark, .contact-mark')
    .forEach((el) => reveal(el));

  function stagger(containerSelector, itemSelector, step, cap = 99) {
    document.querySelectorAll(containerSelector).forEach((container) => {
      container.querySelectorAll(itemSelector).forEach((el, index) => {
        reveal(el, Math.min(index, cap) * step);
      });
    });
  }

  stagger('.jobs', 'li', 0.1);
  stagger('.contact dl', 'div', 0.08);
  document.querySelectorAll('.detail-group').forEach((group) => reveal(group.querySelector('.detail-head')));
  stagger('.detail-waterfall', '.detail-card', 0.035, 16);
}

function setupScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  let ticking = false;
  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const ratio = max > 0 ? Math.min(doc.scrollTop / max, 1) : 0;
    bar.style.transform = `scaleX(${ratio})`;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

function setupBackToTop() {
  const btn = document.getElementById('toTop');
  if (!btn) return;
  let ticking = false;
  function currentTarget() {
    const openModule = document.querySelector('.module-accordion-item.is-open');
    return openModule || document.getElementById('top');
  }

  function targetLabel(target) {
    if (!target || target.id === 'top') return '返回顶部';
    const title = target.querySelector('.module-entry strong');
    return title ? `返回 ${title.textContent}` : '返回当前项目';
  }

  const update = () => {
    const target = currentTarget();
    const hasOpenModule = target && target.id !== 'top';
    btn.classList.toggle('is-visible', hasOpenModule || window.scrollY > window.innerHeight * 0.8);
    const label = targetLabel(target);
    btn.setAttribute('aria-label', label);
    btn.title = label;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
  window.addEventListener('portfolio:module-toggle', update);
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const target = currentTarget();
    if (target && target.id !== 'top') {
      const top = target.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  update();
}

function setupSkillsReveal() {
  const skills = document.querySelector('.skills');
  if (!skills || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (skills.querySelector('ul')?.dataset.marqueeReady !== 'true') {
    skills.querySelectorAll('li').forEach((li, index) => {
      li.style.transitionDelay = `${Math.min(index, 12) * 0.06}s`;
    });
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  io.observe(skills);
}

function setupSkillsMarquee() {
  if (!window.matchMedia('(max-width: 900px)').matches) return;
  const list = document.querySelector('.skills ul');
  if (!list || list.dataset.marqueeReady === 'true') return;

  const items = [...list.children];
  if (!items.length) return;

  const rows = [document.createElement('li'), document.createElement('li')];
  rows.forEach((row, index) => {
    row.className = `skills-marquee-row ${index === 0 ? 'is-forward' : 'is-reverse'}`;
    row.setAttribute('aria-hidden', 'true');
  });

  const rowItems = [items, items];
  rowItems.forEach((group, rowIndex) => {
    const track = document.createElement('div');
    track.className = 'skills-marquee-track';
    [0, 1].forEach(() => {
      const segment = document.createElement('div');
      segment.className = 'skills-marquee-segment';
      group.forEach((item) => {
        const pill = document.createElement('span');
        pill.textContent = item.textContent;
        segment.appendChild(pill);
      });
      track.appendChild(segment);
    });
    rows[rowIndex].appendChild(track);
  });

  list.replaceChildren(...rows);
  list.dataset.marqueeReady = 'true';
}

function setupHeroParallax() {
  const stage = document.querySelector('.hero-stage');
  if (!stage) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const layers = [
    { el: document.querySelector('.hero-device'), depth: 14 },
    { el: document.querySelector('.hero-float-left'), depth: 26 },
    { el: document.querySelector('.hero-float-right'), depth: 32 },
    { el: document.querySelector('.hero-headline'), depth: 10 }
  ].filter((layer) => layer.el);

  let raf = 0;
  let targetX = 0;
  let targetY = 0;

  const apply = () => {
    layers.forEach(({ el, depth }) => {
      el.style.translate = `${targetX * depth}px ${targetY * depth}px`;
    });
    raf = 0;
  };

  stage.addEventListener('mousemove', (event) => {
    const rect = stage.getBoundingClientRect();
    targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    if (!raf) raf = window.requestAnimationFrame(apply);
  });
  stage.addEventListener('mouseleave', () => {
    targetX = 0;
    targetY = 0;
    if (!raf) raf = window.requestAnimationFrame(apply);
  });
}

function setupCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  let raf = 0;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  const apply = () => {
    glow.style.transform = `translate(${x}px, ${y}px)`;
    raf = 0;
  };

  document.addEventListener('mousemove', (event) => {
    x = event.clientX;
    y = event.clientY;
    glow.classList.add('is-active');
    if (!raf) raf = window.requestAnimationFrame(apply);
  }, { passive: true });
  document.addEventListener('mouseleave', () => glow.classList.remove('is-active'));
}

function setupCountUp() {
  const targets = document.querySelectorAll('[data-count]');
  if (!targets.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);
      const end = Number(el.dataset.count) || 0;
      const suffix = el.dataset.suffix || '';
      const duration = 1100;
      let start = 0;
      const step = (now) => {
        if (!start) start = now;
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * end) + suffix;
        if (progress < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  targets.forEach((el) => io.observe(el));
}

function setupMagnetic() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll('.to-top').forEach((el) => {
    el.addEventListener('mousemove', (event) => {
      const rect = el.getBoundingClientRect();
      const mx = event.clientX - rect.left - rect.width / 2;
      const my = event.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${mx * 0.3}px, ${my * 0.3}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}

renderGallery();
setupLightbox();
setupReveal();
setupScrollProgress();
setupBackToTop();
setupSkillsMarquee();
setupSkillsReveal();
setupHeroParallax();
setupCursorGlow();
setupCountUp();
setupMagnetic();
