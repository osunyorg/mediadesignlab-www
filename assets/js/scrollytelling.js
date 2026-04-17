/**
 * Scrollytelling — V2.1
 * Correctifs :
 *  - IDs de sections individualisés (scrolly-01, scrolly-02…)
 *  - initProtoBlock : chargement immédiat si déjà visible + fallback sans IntersectionObserver
 *  - mockup=false dans l'URL ProtoPie pour affichage pleine largeur sur desktop
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     SECTION 1 — Scroller générique existant (#scrolly)
     ══════════════════════════════════════════════════════════ */

  function initScrollyExistant() {
    var scrollyEl = document.querySelector('#scrolly');
    if (!scrollyEl) return;

    var figure     = scrollyEl.querySelector('figure');
    var article    = scrollyEl.querySelector('article');
    var steps      = article ? article.querySelectorAll('.step') : [];
    var figureText = figure  ? figure.querySelector('p')         : null;

    if (!steps.length) return;

    var scroller = scrollama();

    function handleStepEnter(response) {
      steps.forEach(function (s, i) {
        s.classList.toggle('is-active', i === response.index);
      });
      if (figureText) figureText.textContent = response.index + 1;
    }

    scroller
      .setup({ step: '#scrolly article .step', offset: 0.33, debug: false })
      .onStepEnter(handleStepEnter);

    window.addEventListener('resize', function () { scroller.resize(); });
  }


  /* ══════════════════════════════════════════════════════════
     SECTION 2 — Media Design Lab (sticky colonne + steps)
     ══════════════════════════════════════════════════════════ */

  function updateStickyMedia(stickyEl, type, src, alt, label) {
    var img     = stickyEl.querySelector('.mdl-sticky__img');
    var video   = stickyEl.querySelector('.mdl-sticky__video');
    var labelEl = stickyEl.querySelector('.mdl-sticky__label-text');

    if (labelEl) labelEl.textContent = label || '';
    stickyEl.dataset.activeType = type || 'image';

    if (type === 'image' && img) {
      if (img.getAttribute('src') !== src) {
        img.src = src;
        img.alt = alt || '';
      }
    }

    if (type === 'video' && video) {
      if (video.getAttribute('src') !== src) {
        video.src = src;
        video.load();
        video.addEventListener('loadedmetadata', function onReady() {
          video.play().catch(function () {});
          video.removeEventListener('loadedmetadata', onReady);
        });
      } else {
        video.currentTime = 0;
        video.play().catch(function () {});
      }
    }
  }

  function initScrollyMDL(scrollyId, stickyId, stepsId, offset) {
    var scrollyEl = document.getElementById(scrollyId);
    if (!scrollyEl) return;

    var stickyEl = document.getElementById(stickyId);
    var stepsEl  = document.getElementById(stepsId);
    if (!stickyEl || !stepsEl) return;

    var steps = stepsEl.querySelectorAll('.mdl-step');
    if (!steps.length) return;

    // Premier média affiché immédiatement
    var first = steps[0];
    updateStickyMedia(
      stickyEl,
      first.dataset.mediaType || 'image',
      first.dataset.mediaSrc  || '',
      first.dataset.mediaAlt  || '',
      first.dataset.label     || ''
    );

    var scroller = scrollama();

    scroller
      .setup({
        step:   '#' + scrollyId + ' .mdl-step',
        offset: offset !== undefined ? offset : 0.4,
        debug:  false
      })
      .onStepEnter(function (response) {
        var el = response.element;
        steps.forEach(function (s) { s.classList.remove('is-active'); });
        el.classList.add('is-active');

        updateStickyMedia(
          stickyEl,
          el.dataset.mediaType || 'image',
          el.dataset.mediaSrc  || '',
          el.dataset.mediaAlt  || '',
          el.dataset.label     || ''
        );
      });

    window.addEventListener('resize', function () { scroller.resize(); });
  }


  /* ══════════════════════════════════════════════════════════
     SECTION 3 — Bloc prototype ProtoPie
     Corrections V2.1 :
     - Chargement immédiat si le bloc est déjà visible au load
     - Fallback sans IntersectionObserver
     - Gestion scroll page ↔ iframe
     ══════════════════════════════════════════════════════════ */

  function initProtoBlock(blockId) {
    var block = document.getElementById(blockId);
    if (!block) return;

    var iframe   = block.querySelector('.mdl-proto-block__iframe');
    var closeBtn = block.querySelector('.mdl-proto-block__close');
    if (!iframe) return;

    var isLoaded    = false;
    var isCapturing = false;

    // ── Chargement de l'iframe ──────────────────────────────
    function loadIframe() {
      if (isLoaded) return;
      var src = iframe.dataset.src;
      if (!src) return;
      iframe.src = src;
      isLoaded = true;
    }

    // Utiliser IntersectionObserver si disponible, sinon charger direct
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            loadIframe();
            observer.disconnect();
          }
        });
      }, {
        // threshold bas : commence à charger dès que 5% du bloc est visible
        threshold: 0.05,
        // rootMargin positif : précharge 200px avant que le bloc soit visible
        rootMargin: '200px 0px'
      });
      observer.observe(block);
    } else {
      // Navigateurs anciens : charger immédiatement
      loadIframe();
    }

    // ── Gestion conflit scroll page ↔ iframe ────────────────
    function captureScroll() {
      if (isCapturing) return;
      isCapturing = true;
      block.classList.add('is-capturing-scroll');
      document.body.style.overflow = 'hidden';
    }

    function releaseScroll() {
      if (!isCapturing) return;
      isCapturing = false;
      block.classList.remove('is-capturing-scroll');
      document.body.style.overflow = '';
    }

    iframe.addEventListener('mouseenter', captureScroll);
    iframe.addEventListener('touchstart', captureScroll, { passive: true });
    block.addEventListener('mouseleave', releaseScroll);

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        releaseScroll();
        var nextEl = block.nextElementSibling;
        if (nextEl) {
          nextEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    window.addEventListener('keydown', function (e) {
      if (isCapturing && (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ')) {
        releaseScroll();
      }
    });
  }


  /* ══════════════════════════════════════════════════════════
     POINT D'ENTRÉE
     ══════════════════════════════════════════════════════════ */

  function init() {
    if (typeof scrollama === 'undefined') {
      console.warn('[Scrollytelling] scrollama.js introuvable.');
      return;
    }

    // Scroller existant (si présent sur la page)
    initScrollyExistant();

    // Chapitre 01
    initScrollyMDL('scrolly-01', 'sticky-01', 'steps-01');

    // Chapitre 02
    initScrollyMDL('scrolly-02', 'sticky-02', 'steps-02');

    // Blocs prototypes
    initProtoBlock('proto-lemonde-caf');

    // Ajouter ici les prochains chapitres et prototypes :
    // initScrollyMDL('scrolly-03', 'sticky-03', 'steps-03');
    // initProtoBlock('proto-epstein');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
