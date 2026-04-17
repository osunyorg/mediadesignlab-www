/**
 * Scrollytelling — fichier JS fusionné
 * ─────────────────────────────────────────────────────────────
 * Gère deux instances scrollama indépendantes sur la même page :
 *
 *  1. #scrolly          — section existante (figure + steps génériques)
 *                         Portée originale : exemple Osuny/Scrollama
 *                         Migration : D3 → Vanilla JS, resize CSS-first
 *
 *  2. #scrolly-narrations — section Media Design Lab
 *                           Médias (images/vidéos) pilotés par data-attributes
 *
 * Dépendances (à charger avant ce fichier) :
 *   <script src="https://unpkg.com/scrollama@3/build/scrollama.min.js"></script>
 *
 * NOTE : D3 n'est plus requis. Si d3 est chargé ailleurs sur la page
 *        pour d'autres usages, il n'y a pas de conflit.
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     SECTION 1 — Scroller générique existant (#scrolly)
     Reproduit fidèlement le comportement de l'exemple Osuny,
     sans D3 et sans calcul de hauteur JS (CSS s'en charge).
     ══════════════════════════════════════════════════════════ */

  function initScrollyExistant() {
    var scrollyEl  = document.querySelector('#scrolly');
    if (!scrollyEl) return;                        // section absente → on passe

    var figure     = scrollyEl.querySelector('figure');
    var article    = scrollyEl.querySelector('article');
    var steps      = article  ? article.querySelectorAll('.step') : [];
    var figureText = figure   ? figure.querySelector('p')         : null;

    if (!steps.length) return;

    var scroller = scrollama();

    // ── Resize ──────────────────────────────────────────────
    // L'original calculait les hauteurs en JS avec D3.
    // On conserve uniquement l'appel scroller.resize() ;
    // les hauteurs sont désormais gérées par CSS (height: 75vh, position: sticky).
    function handleResize() {
      scroller.resize();
    }

    // ── Callback step ────────────────────────────────────────
    function handleStepEnter(response) {
      // Désactiver tous les steps, activer le courant
      steps.forEach(function (s, i) {
        s.classList.toggle('is-active', i === response.index);
      });

      // Mettre à jour le compteur dans la figure
      if (figureText) {
        figureText.textContent = response.index + 1;
      }
    }

    // ── Init ─────────────────────────────────────────────────
    scroller
      .setup({
        step:   '#scrolly article .step',
        offset: 0.33,
        debug:  false
      })
      .onStepEnter(handleStepEnter);

    window.addEventListener('resize', handleResize);
  }


  /* ══════════════════════════════════════════════════════════
     SECTION 2 — Media Design Lab (#scrolly-narrations, etc.)
     Médias (images / vidéos) pilotés par data-attributes sur
     chaque .mdl-step. Extensible à n'importe quel nombre
     de sections en appelant initScrollyMDL() plusieurs fois.
     ══════════════════════════════════════════════════════════ */

  /**
   * Injecte et affiche un média dans le sticky.
   *
   * @param {HTMLElement} stickyEl
   * @param {string}      type     'image' | 'video'
   * @param {string}      src
   * @param {string}      alt
   * @param {string}      label
   */
  function updateStickyMedia(stickyEl, type, src, alt, label) {
    var img     = stickyEl.querySelector('.mdl-sticky__img');
    var video   = stickyEl.querySelector('.mdl-sticky__video');
    var labelEl = stickyEl.querySelector('.mdl-sticky__label-text');

    if (labelEl) labelEl.textContent = label || '';

    // Le type est lu par CSS pour piloter les opacités
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
          video.play().catch(function () { /* autoplay bloqué → silencieux */ });
          video.removeEventListener('loadedmetadata', onReady);
        });
      } else {
        video.currentTime = 0;
        video.play().catch(function () {});
      }
    }
  }

  function pauseCurrentVideo(stickyEl) {
    var video = stickyEl.querySelector('.mdl-sticky__video');
    if (video && !video.paused) video.pause();
  }

  /**
   * Initialise une section MDL scrollytelling.
   *
   * @param {string} scrollyId  id de l'élément .mdl-scrolly
   * @param {string} stickyId   id de l'élément .mdl-sticky
   * @param {string} stepsId    id de l'élément article.mdl-steps
   */
  function initScrollyMDL(scrollyId, stickyId, stepsId) {
    var scrollyEl = document.getElementById(scrollyId);
    if (!scrollyEl) return;

    var stickyEl  = document.getElementById(stickyId);
    var stepsEl   = document.getElementById(stepsId);
    if (!stickyEl || !stepsEl) return;

    var steps = stepsEl.querySelectorAll('.mdl-step');
    if (!steps.length) return;

    // ── Afficher le premier média dès le chargement ──────────
    var firstStep = steps[0];
    updateStickyMedia(
      stickyEl,
      firstStep.dataset.mediaType || 'image',
      firstStep.dataset.mediaSrc  || '',
      firstStep.dataset.mediaAlt  || '',
      firstStep.dataset.label     || ''
    );

    var scroller = scrollama();

    scroller
      .setup({
        step:   '#' + scrollyId + ' .mdl-step',
        offset: 0.5,
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
      })
      .onStepExit(function (response) {
        // Pause vidéo en fin de section (scroll descendant)
        if (response.index === steps.length - 1 && response.direction === 'down') {
          pauseCurrentVideo(stickyEl);
        }
      });

    window.addEventListener('resize', function () {
      scroller.resize();
    });
  }


  /* ══════════════════════════════════════════════════════════
     POINT D'ENTRÉE
     ══════════════════════════════════════════════════════════ */

  function init() {
    if (typeof scrollama === 'undefined') {
      console.warn('[Scrollytelling] scrollama.js introuvable — vérifiez le chargement du script.');
      return;
    }

    // Section générique existante
    initScrollyExistant();

    // Section(s) Media Design Lab
    initScrollyMDL('scrolly-narrations', 'sticky-narrations', 'steps-narrations');

    // Décommenter pour ajouter d'autres sections :
    // initScrollyMDL('scrolly-accessibilite', 'sticky-accessibilite', 'steps-accessibilite');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
