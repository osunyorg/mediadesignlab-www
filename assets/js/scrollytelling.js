/**
 * Scrollytelling — V2
 * Layout : visuel sticky en colonne gauche (contained) / texte colonne droite
 *
 * Dépendance :
 *   <script src="https://unpkg.com/scrollama@3/build/scrollama.min.js"></script>
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     SECTION 1 — Scroller générique existant (#scrolly)
     Inchangé par rapport à la V1 fusionnée.
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
     SECTION 2 — Media Design Lab
     Différences V2 :
     - Le sticky est une colonne flex, pas un fond plein écran.
     - object-fit: contain → pas besoin de gérer des dimensions.
     - La vidéo joue dans son cadre naturel (hauteur auto).
     - On retire la pause "fin de section" car le sticky sort
       naturellement du viewport avec le reste du contenu.
     ══════════════════════════════════════════════════════════ */

  /**
   * Met à jour le visuel dans la colonne sticky.
   */
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

  /**
   * Initialise une section MDL.
   *
   * @param {string} scrollyId
   * @param {string} stickyId
   * @param {string} stepsId
   * @param {number} [offset=0.4]  — seuil de déclenchement (0–1)
   *   Valeur recommandée pour le layout colonne :
   *   0.4 déclenche le changement quand le step atteint 40% de l'écran,
   *   ce qui correspond visuellement au centre de la colonne visuelle.
   */
  function initScrollyMDL(scrollyId, stickyId, stepsId, offset) {
    var scrollyEl = document.getElementById(scrollyId);
    if (!scrollyEl) return;

    var stickyEl = document.getElementById(stickyId);
    var stepsEl  = document.getElementById(stepsId);
    if (!stickyEl || !stepsEl) return;

    var steps = stepsEl.querySelectorAll('.mdl-step');
    if (!steps.length) return;

    // Afficher le premier média immédiatement
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
      // Pas de onStepExit nécessaire en layout colonne :
      // le sticky sort du viewport naturellement avec le scroll.

    window.addEventListener('resize', function () { scroller.resize(); });
  }


/**
 * Bloc prototype ProtoPie
 * À ajouter dans scrollytelling-v2.js, dans la fonction init()
 *
 * Gère :
 *  1. Chargement lazy de l'iframe (data-src → src au premier scroll vers la zone)
 *  2. Neutralisation du conflit scroll page ↔ scroll iframe
 *  3. Bouton "Continuer" pour reprendre le scroll de la page
 */

function initProtoBlock(blockId) {
  var block = document.getElementById(blockId);
  if (!block) return;

  var iframe    = block.querySelector('.mdl-proto-block__iframe');
  var closeBtn  = block.querySelector('.mdl-proto-block__close');
  var isLoaded  = false;
  var isCapturing = false;

  // ── 1. Lazy load : charger l'iframe seulement quand elle est visible ──
  var loadObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !isLoaded) {
        var src = iframe.dataset.src;
        if (src) {
          iframe.src = src;
          isLoaded = true;
        }
        loadObserver.disconnect();
      }
    });
  }, { threshold: 0.1 });

  loadObserver.observe(block);

  // ── 2. Conflit scroll : quand l'utilisateur entre dans l'iframe,
  //    on laisse le scroll à ProtoPie et on affiche le bouton "Continuer".
  //    Quand il clique "Continuer", on réactive le scroll de la page.

  function captureScroll() {
    if (isCapturing) return;
    isCapturing = true;
    block.classList.add('is-capturing-scroll');
    // Bloquer le scroll de la page pendant l'interaction avec le proto
    document.body.style.overflow = 'hidden';
  }

  function releaseScroll() {
    if (!isCapturing) return;
    isCapturing = false;
    block.classList.remove('is-capturing-scroll');
    document.body.style.overflow = '';
  }

  // Capturer le scroll quand la souris/le doigt entre dans le cadre
  iframe.addEventListener('mouseenter', captureScroll);

  // Sur mobile : capturer au touch
  iframe.addEventListener('touchstart', captureScroll, { passive: true });

  // Bouton "Continuer" : libérer le scroll et scroller doucement après le bloc
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      releaseScroll();
      // Scroll vers l'élément suivant après le bloc proto
      var nextEl = block.nextElementSibling;
      if (nextEl) {
        nextEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Libérer automatiquement si la souris quitte la zone complète du bloc
  block.addEventListener('mouseleave', releaseScroll);

  // Sécurité : libérer si la page est scrollée depuis l'extérieur
  // (ex: clavier, bouton du navigateur)
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

    initScrollyExistant();

    initScrollyMDL('scrolly-narrations', 'sticky-narrations', 'steps-narrations');

    initProtoBlock('proto-lemonde-caf');

    // Autres sections à activer le moment venu :
    // initScrollyMDL('scrolly-accessibilite', 'sticky-accessibilite', 'steps-accessibilite');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
