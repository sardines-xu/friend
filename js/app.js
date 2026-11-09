(function () {
      const TOTAL_PHOTOS = 54;
      const PHOTO_FOLDER = 'photos';

      // 4 3D Elliptical Rings: Horizontal (0°), Vertical (90°), Diagonal (+45°), Diagonal (-45°)
      const RING_CONFIGS = [
        { id: 0, angleDeg: 0, rad: 0, dirX: 1, dirY: 0, baseOmega: 0.14 },
        { id: 1, angleDeg: 90, rad: Math.PI / 2, dirX: 0, dirY: 1, baseOmega: -0.125 },
        { id: 2, angleDeg: 45, rad: Math.PI / 4, dirX: Math.SQRT1_2, dirY: Math.SQRT1_2, baseOmega: 0.13 },
        { id: 3, angleDeg: -45, rad: -Math.PI / 4, dirX: Math.SQRT1_2, dirY: -Math.SQRT1_2, baseOmega: -0.135 }
      ];

      const photos = [];
      const palettes = [
        ['#233347', '#c89b6e', '#f3e7d3'],
        ['#353852', '#d67c63', '#f0cba1'],
        ['#1f3c47', '#3b8f85', '#e7c67d'],
        ['#41445e', '#998796', '#f2e8e3'],
        ['#1b314f', '#487899', '#add4d9'],
        ['#362d27', '#c4a068', '#ead7c3']
      ];

      function createArtisticFallbackURI(num) {
        const pal = palettes[(num - 1) % palettes.length];
        const numStr = String(num).padStart(2, '0');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 460" width="400" height="460">
          <defs>
            <linearGradient id="g${num}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${pal[0]}"/>
              <stop offset="62%" stop-color="${pal[1]}"/>
              <stop offset="100%" stop-color="${pal[2]}"/>
            </linearGradient>
          </defs>
          <rect width="400" height="460" fill="url(#g${num})"/>
          <circle cx="${130 + (num * 23) % 150}" cy="${125 + (num * 17) % 115}" r="${52 + (num % 28)}" fill="${pal[2]}" fill-opacity="0.24"/>
          <path d="M0 340 Q 130 ${260 + (num % 50)} 260 330 T 400 300 L 400 460 L 0 460 Z" fill="#0c101c" fill-opacity="0.42"/>
          <path d="M0 378 Q 180 ${315 + (num % 40)} 400 368 L 400 460 L 0 460 Z" fill="#070a12" fill-opacity="0.58"/>
          <rect x="22" y="22" width="356" height="416" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1"/>
          <text x="200" y="226" text-anchor="middle" fill="#ffffff" fill-opacity="0.88" font-family="Georgia, serif" font-size="54" font-style="italic">${numStr}</text>
        </svg>`;
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
      }

      // Distribute 54 photos across the 4 rings (14, 14, 13, 13)
      const ringBuckets = [[], [], [], []];
      for (let i = 1; i <= TOTAL_PHOTOS; i++) {
        const ringId = (i - 1) % 4;
        const photoObj = {
          id: i,
          primaryPath: `${PHOTO_FOLDER}/${i}.jpg`,
          secondaryPath: `${i}.jpg`,
          fallbackUri: createArtisticFallbackURI(i),
          ringId: ringId,
          slotIndex: ringBuckets[ringId].length,
          tiltDeg: ((i * 7) % 9 - 4) * 0.55,
          el: null,
          imgEl: null,
          screenX: 0,
          screenY: 0
        };
        ringBuckets[ringId].push(photoObj);
        photos.push(photoObj);
      }

      const ringsState = RING_CONFIGS.map((cfg, idx) => {
        const count = ringBuckets[idx].length;
        return {
          ...cfg,
          count: count,
          phase: (idx * Math.PI) / 8, // initial phase offset so rings interleave gracefully
          omegaVelocity: 0,
          targetPhase: null
        };
      });

      // DOM elements
      const orbitStage = document.getElementById('orbit-stage');
      const cardsContainer = document.getElementById('cards-container');
      const detailOverlay = document.getElementById('detail-overlay');
      const exquisiteFrame = document.getElementById('exquisite-frame');
      const detailImgCurrent = document.getElementById('detail-img-current');

      // Ring Geometry Parameters (responsive to viewport)
      let majorRadius = 420;
      let minorRadius = 155;

      function updateRingGeometry() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const minDim = Math.min(vw, vh);
        const maxDim = Math.max(vw, vh);
        majorRadius = Math.max(240, Math.min(maxDim * 0.44, 620));
        minorRadius = Math.max(88, Math.min(minDim * 0.23, 225));

        RING_CONFIGS.forEach((cfg) => {
          const wrap = document.getElementById(`ring-guide-${cfg.id}`);
          if (wrap) {
            wrap.style.width = `${majorRadius * 2}px`;
            wrap.style.height = `${minorRadius * 2}px`;
            wrap.style.transform = `translate(-50%, -50%) rotate(${cfg.angleDeg}deg)`;
          }
        });
      }

      window.addEventListener('resize', updateRingGeometry);
      updateRingGeometry();

      function getPhotoSrc(photo) {
        return photo.resolvedSrc || photo.primaryPath;
      }

      // Build 54 photo cards
      function buildTrackCards() {
        const frag = document.createDocumentFragment();
        photos.forEach((photo) => {
          const card = document.createElement('div');
          card.className = 'track-card';
          card.dataset.photoId = String(photo.id);
          card.style.setProperty('--card-tilt', `${photo.tiltDeg.toFixed(2)}deg`);

          const inner = document.createElement('div');
          inner.className = 'track-card-inner';
          inner.style.animationDelay = `${-(photo.id * 0.33).toFixed(2)}s`;

          ['tl', 'tr', 'bl', 'br'].forEach((pos) => {
            const corner = document.createElement('span');
            corner.className = `corner-ornament corner-${pos}`;
            inner.appendChild(corner);
          });

          const wrap = document.createElement('div');
          wrap.className = 'card-photo-wrap';

          const img = document.createElement('img');
          img.alt = `Memory ${photo.id}`;
          img.src = photo.primaryPath;

          img.onerror = function () {
            if (!img.dataset.triedRoot) {
              img.dataset.triedRoot = '1';
              img.src = photo.secondaryPath;
            } else if (img.src !== photo.fallbackUri) {
              photo.resolvedSrc = photo.fallbackUri;
              img.src = photo.fallbackUri;
            }
          };
          img.onload = function () {
            photo.resolvedSrc = img.src;
          };

          const shimmer = document.createElement('div');
          shimmer.className = 'card-shimmer';

          wrap.appendChild(img);
          wrap.appendChild(shimmer);

          const caption = document.createElement('div');
          caption.className = 'card-caption-tiny';
          caption.innerHTML = `
            <span>${String(photo.id).padStart(2, '0')}</span>
            <span class="text-[#b89149]">✦</span>
          `;

          inner.appendChild(wrap);
          inner.appendChild(caption);
          card.appendChild(inner);

          photo.el = card;
          photo.imgEl = img;
          frag.appendChild(card);
        });
        cardsContainer.appendChild(frag);
      }

      buildTrackCards();

      // Global animation states
      const introStartTime = performance.now();
      const INTRO_DURATION = 1550; // ~1.5s fast-to-slow entry animation
      let userSpeedTarget = 1;
      let userSpeedCurrent = 1;
      let isOrbitPaused = false;
      let activePhotoId = null;
      let isDetailOpen = false;
      let ringHighlightTimer = null;

      function highlightRing(ringId) {
        for (let i = 0; i < 4; i++) {
          const el = document.querySelector(`#ring-guide-${i} .ring-guide-ellipse`);
          if (el) el.classList.toggle('active-ring', i === ringId);
        }
        clearTimeout(ringHighlightTimer);
        if (ringId !== null) {
          ringHighlightTimer = setTimeout(() => {
            for (let i = 0; i < 4; i++) {
              const el = document.querySelector(`#ring-guide-${i} .ring-guide-ellipse`);
              if (el) el.classList.remove('active-ring');
            }
          }, 800);
        }
      }

      // Rotate a photo's ring so that the photo lands squarely at the front-most center (theta = PI/2, where cos(theta)=0, sin(theta)=1)
      function centerPhotoAtFrontOfRing(photoId) {
        const photo = photos[photoId - 1];
        if (!photo) return;
        const ring = ringsState[photo.ringId];
        const baseSlotAngle = (photo.slotIndex / ring.count) * Math.PI * 2;
        // Target angle theta = baseSlotAngle + phase = Math.PI / 2 (front-most apex, closest to viewer & center)
        const desiredPhase = Math.PI / 2 - baseSlotAngle;
        const twoPi = Math.PI * 2;
        let diff = ((desiredPhase - ring.phase) % twoPi + twoPi) % twoPi;
        if (diff > Math.PI) diff -= twoPi;

        ring.targetPhase = ring.phase + diff;
        ring.omegaVelocity = 0;

        photos.forEach((p) => {
          if (p.el) p.el.classList.toggle('focused-card', p.id === photoId);
        });
      }

      // Open single photo view with exquisite frame
      function openDetailView(photoId) {
        const photo = photos[photoId - 1];
        if (!photo) return;
        activePhotoId = photoId;
        isDetailOpen = true;

        centerPhotoAtFrontOfRing(photoId);

        detailImgCurrent.src = getPhotoSrc(photo);
        detailImgCurrent.style.transform = 'translate3d(0,0,0) scale(1)';
        detailImgCurrent.style.opacity = '1';

        const dx = photo.screenX || 0;
        const dy = photo.screenY || 0;

        exquisiteFrame.style.transition = 'none';
        exquisiteFrame.style.transform = `translate3d(${dx * 0.65}px, ${dy * 0.65}px, 0) scale(0.36) rotate(${photo.tiltDeg}deg)`;
        exquisiteFrame.style.opacity = '0.15';

        document.body.classList.add('detail-open');
        detailOverlay.setAttribute('aria-hidden', 'false');

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            exquisiteFrame.style.transition = 'transform 0.64s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.45s ease';
            exquisiteFrame.style.transform = 'translate3d(0px, 0px, 0px) scale(1) rotate(0deg)';
            exquisiteFrame.style.opacity = '1';
          });
        });
      }

      // Swipe down to exit single view and return with previously viewed photo centered in front
      function closeDetailView() {
        if (!isDetailOpen) return;
        isDetailOpen = false;

        if (activePhotoId) {
          centerPhotoAtFrontOfRing(activePhotoId);
          isOrbitPaused = true;
          userSpeedTarget = 0;
        }

        exquisiteFrame.style.transition = 'transform 0.56s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.46s ease';
        exquisiteFrame.style.transform = 'translate3d(0px, 135px, 0px) scale(0.46)';
        exquisiteFrame.style.opacity = '0';

        document.body.classList.remove('detail-open');
        detailOverlay.setAttribute('aria-hidden', 'true');
      }

      // Switch photos inside detail frame (distinct orbital slide transition)
      let isSwitching = false;
      function switchDetailPhoto(step, axis = 'x') {
        if (!isDetailOpen || isSwitching || !activePhotoId) return;
        isSwitching = true;

        const nextId = ((activePhotoId - 1 + step + TOTAL_PHOTOS) % TOTAL_PHOTOS) + 1;
        const nextPhoto = photos[nextId - 1];
        activePhotoId = nextId;

        centerPhotoAtFrontOfRing(nextId);
        highlightRing(nextPhoto.ringId);

        const dist = 95;
        const outX = axis === 'x' ? -step * dist : 0;
        const outY = axis === 'y' ? -step * dist : 0;
        const inX = -outX;
        const inY = -outY;

        exquisiteFrame.style.transition = 'transform 0.25s ease';
        exquisiteFrame.style.transform = `translate3d(${outX * 0.14}px, ${outY * 0.14}px, 0) scale(0.985)`;

        detailImgCurrent.style.transition = 'transform 0.24s cubic-bezier(0.4, 0, 1, 1), opacity 0.22s ease';
        detailImgCurrent.style.transform = `translate3d(${outX}px, ${outY}px, 0) scale(0.93)`;
        detailImgCurrent.style.opacity = '0';

        setTimeout(() => {
          detailImgCurrent.src = getPhotoSrc(nextPhoto);
          detailImgCurrent.style.transition = 'none';
          detailImgCurrent.style.transform = `translate3d(${inX}px, ${inY}px, 0) scale(0.93)`;
          detailImgCurrent.style.opacity = '0';

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              detailImgCurrent.style.transition = 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.34s ease';
              detailImgCurrent.style.transform = 'translate3d(0, 0, 0) scale(1)';
              detailImgCurrent.style.opacity = '1';

              exquisiteFrame.style.transition = 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)';
              exquisiteFrame.style.transform = 'translate3d(0, 0, 0) scale(1)';

              setTimeout(() => {
                isSwitching = false;
              }, 260);
            });
          });
        }, 210);
      }

      detailOverlay.addEventListener('click', (e) => {
        if (e.target === detailOverlay) closeDetailView();
      });

      // -------------------------------------------------------------
      // All-Photos Orbit Stage Gestures: Drag to spin rings, click to pause/resume or pop photo
      // -------------------------------------------------------------
      let pointerDown = false;
      let lastX = 0;
      let lastY = 0;
      let dragDist = 0;
      let clickedPhotoId = null;

      orbitStage.addEventListener('pointerdown', (e) => {
        if (isDetailOpen) return;
        pointerDown = true;
        lastX = e.clientX;
        lastY = e.clientY;
        dragDist = 0;

        const cardEl = e.target.closest('.track-card');
        clickedPhotoId = cardEl ? Number(cardEl.dataset.photoId) : null;

        ringsState.forEach((r) => { r.targetPhase = null; });
      });

      window.addEventListener('pointermove', (e) => {
        if (!pointerDown || isDetailOpen) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        dragDist += Math.hypot(dx, dy);

        if (dragDist > 6) {
          let bestRing = 0;
          let maxProj = 0;
          ringsState.forEach((ring) => {
            const proj = dx * ring.dirX + dy * ring.dirY;
            const dTheta = -(proj / majorRadius) * 1.35;
            ring.phase += dTheta;
            ring.omegaVelocity = dTheta * 22;
            if (Math.abs(proj) > maxProj) {
              maxProj = Math.abs(proj);
              bestRing = ring.id;
            }
          });
          highlightRing(bestRing);
        }
      });

      window.addEventListener('pointerup', () => {
        if (!pointerDown || isDetailOpen) return;
        pointerDown = false;

        if (dragDist < 8) {
          if (clickedPhotoId) {
            openDetailView(clickedPhotoId);
          } else {
            // Click blank space to gracefully slow down / pause or resume orbit rotation
            isOrbitPaused = !isOrbitPaused;
            userSpeedTarget = isOrbitPaused ? 0 : 1;
            if (!isOrbitPaused) {
              photos.forEach((p) => { if (p.el) p.el.classList.remove('focused-card'); });
            }
          }
        }
        clickedPhotoId = null;
      });

      // Mouse wheel support for both views
      window.addEventListener('wheel', (e) => {
        if (isDetailOpen) {
          if (Math.abs(e.deltaY) > 18 || Math.abs(e.deltaX) > 18) {
            const useX = Math.abs(e.deltaX) > Math.abs(e.deltaY);
            const delta = useX ? e.deltaX : e.deltaY;
            switchDetailPhoto(delta > 0 ? 1 : -1, useX ? 'x' : 'y');
          }
          return;
        }
        ringsState.forEach((ring) => {
          ring.targetPhase = null;
          const proj = e.deltaX * ring.dirX + e.deltaY * ring.dirY;
          ring.omegaVelocity += (proj / majorRadius) * 0.85;
        });
      }, { passive: true });

      // -------------------------------------------------------------
      // Single Photo Detail Frame Gestures: Left/Right/Up to switch, Down to exit
      // -------------------------------------------------------------
      let dDown = false;
      let dStartX = 0;
      let dStartY = 0;
      let dCurrX = 0;
      let dCurrY = 0;

      exquisiteFrame.addEventListener('pointerdown', (e) => {
        if (!isDetailOpen) return;
        dDown = true;
        dStartX = dCurrX = e.clientX;
        dStartY = dCurrY = e.clientY;
        exquisiteFrame.style.transition = 'none';
      });

      window.addEventListener('pointermove', (e) => {
        if (!dDown || !isDetailOpen) return;
        dCurrX = e.clientX;
        dCurrY = e.clientY;
        const dx = dCurrX - dStartX;
        const dy = dCurrY - dStartY;

        if (dy > 14 && Math.abs(dy) > Math.abs(dx) * 1.1) {
          const s = Math.max(0.66, 1 - dy / 620);
          exquisiteFrame.style.transform = `translate3d(${dx * 0.25}px, ${dy * 0.56}px, 0) scale(${s})`;
        } else {
          exquisiteFrame.style.transform = `translate3d(${dx * 0.22}px, ${dy * 0.22}px, 0) rotate(${dx * 0.015}deg)`;
        }
      });

      window.addEventListener('pointerup', () => {
        if (!dDown || !isDetailOpen) return;
        dDown = false;
        const dx = dCurrX - dStartX;
        const dy = dCurrY - dStartY;

        // Swipe down -> exit detail view and center previously viewed photo
        if (dy > 64 && Math.abs(dy) > Math.abs(dx) * 1.1) {
          closeDetailView();
          return;
        }

        // Swipe left / right -> switch photo horizontally
        if (Math.abs(dx) > 40 && Math.abs(dx) >= Math.abs(dy)) {
          switchDetailPhoto(dx < 0 ? 1 : -1, 'x');
          return;
        }

        // Swipe up -> switch photo vertically
        if (dy < -42 && Math.abs(dy) > Math.abs(dx)) {
          switchDetailPhoto(1, 'y');
          return;
        }

        exquisiteFrame.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
        exquisiteFrame.style.transform = 'translate3d(0, 0, 0) scale(1) rotate(0deg)';
      });

      window.addEventListener('keydown', (e) => {
        if (isDetailOpen) {
          if (e.key === 'ArrowRight') switchDetailPhoto(1, 'x');
          else if (e.key === 'ArrowLeft') switchDetailPhoto(-1, 'x');
          else if (e.key === 'ArrowUp') switchDetailPhoto(1, 'y');
          else if (e.key === 'ArrowDown' || e.key === 'Escape') closeDetailView();
        }
      });

      // -------------------------------------------------------------
      // Core 3D Ring Depth Animation Loop (with 1.5s Fast-to-Slow Entry Burst)
      // -------------------------------------------------------------
      let lastTime = performance.now();

      function animateRings(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        // 1.5s Fast-to-Slow Entry Deceleration Curve
        const elapsed = now - introStartTime;
        let introBoost = 1;
        if (elapsed < INTRO_DURATION) {
          const progress = elapsed / INTRO_DURATION;
          // Cubic ease-out from 15x speed down to 1x normal speed over 1.5 seconds
          const easeOut = 1 - Math.pow(progress, 3);
          introBoost = 1 + 14.5 * easeOut;
        }

        // Smoothly interpolate user pause/resume speed multiplier
        userSpeedCurrent += (userSpeedTarget - userSpeedCurrent) * Math.min(1, dt * 3.0);

        ringsState.forEach((ring) => {
          if (ring.targetPhase !== null) {
            const diff = ring.targetPhase - ring.phase;
            ring.phase += diff * Math.min(1, dt * 6.5);
            if (Math.abs(diff) < 0.003) {
              ring.phase = ring.targetPhase;
              ring.targetPhase = null;
            }
          } else {
            ring.phase += (ring.baseOmega * introBoost * userSpeedCurrent + ring.omegaVelocity) * dt;
            ring.omegaVelocity *= Math.pow(0.91, dt * 60);
            if (Math.abs(ring.omegaVelocity) < 0.0005) ring.omegaVelocity = 0;
          }
        });

        // Render all 54 photos along their 3D elliptical rings with real depth-of-field
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const ring = ringsState[photo.ringId];

          const theta = (photo.slotIndex / ring.count) * Math.PI * 2 + ring.phase;

          // Local elliptical coordinates:
          // u along major axis, v along minor axis, depthNorm in [-1 (far back), +1 (front closest)]
          const u = majorRadius * Math.cos(theta);
          const v = minorRadius * Math.sin(theta) * 0.42; // tilted ring plane projection
          const depthNorm = Math.sin(theta); // +1 front apex, -1 back apex

          // Rotate (u, v) by ring's axis angle (0°, 90°, +45°, -45°)
          const cosA = Math.cos(ring.rad);
          const sinA = Math.sin(ring.rad);

          // When a photo approaches the front apex (cos(theta) -> 0), gently pull its minor-axis offset toward 0 so centered photos align right at screen center
          const centerPull = 1 - Math.pow(Math.max(0, depthNorm), 3) * 0.82;
          const x = u * cosA - (v * centerPull) * sinA;
          const y = u * sinA + (v * centerPull) * cosA;

          photo.screenX = x;
          photo.screenY = y;

          // Depth-of-field scaling, opacity, blur, and z-index
          const depth01 = (depthNorm + 1) * 0.5; // 0 (back) -> 1 (front)
          const scale = 0.46 + 0.64 * Math.pow(depth01, 1.15); // 0.46 in back, 1.10 in front
          const opacity = 0.24 + 0.76 * Math.pow(depth01, 0.9);
          const zIndex = Math.round(10 + depth01 * 180) + (photo.id === activePhotoId ? 220 : 0);

          const el = photo.el;
          if (el) {
            el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0px) scale(${scale.toFixed(3)})`;
            el.style.opacity = opacity.toFixed(3);
            el.style.zIndex = String(zIndex);
          }
        }

        requestAnimationFrame(animateRings);
      }

      requestAnimationFrame(animateRings);

      // -------------------------------------------------------------
      // Background Music Control
      // -------------------------------------------------------------
      const bgMusic = document.getElementById('bg-music');
      const musicToggleBtn = document.getElementById('music-toggle-btn');
      const musicDisc = document.getElementById('music-disc');
      let isMusicPlaying = false;

      function updateMusicUI(playing) {
        isMusicPlaying = playing;
        musicDisc.classList.toggle('vinyl-spinning', playing);
        musicDisc.style.opacity = playing ? '1' : '0.45';
      }

      function tryPlayMusic() {
        if (!bgMusic) return;
        bgMusic.volume = 0.75;
        const p = bgMusic.play();
        if (p !== undefined) {
          p.then(() => updateMusicUI(true)).catch(() => updateMusicUI(false));
        }
      }

      window.addEventListener('load', tryPlayMusic);

      function unlockAudio() {
        if (!isMusicPlaying && bgMusic.paused) {
          tryPlayMusic();
        }
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      }
      window.addEventListener('pointerdown', unlockAudio);
      window.addEventListener('keydown', unlockAudio);

      musicToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (bgMusic.paused) {
          bgMusic.play().then(() => updateMusicUI(true)).catch(() => {});
        } else {
          bgMusic.pause();
          updateMusicUI(false);
        }
      });

      // -------------------------------------------------------------
      // Refined Starlight & Warm Gold Bokeh Background Canvas
      // -------------------------------------------------------------
      const starCanvas = document.getElementById('starlight-canvas');
      const ctx = starCanvas.getContext('2d');
      const stars = [];
      const bokehs = [];

      function resizeCanvas() {
        starCanvas.width = window.innerWidth;
        starCanvas.height = window.innerHeight;
      }
      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();

      for (let i = 0; i < 85; i++) {
        stars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: Math.random() * 1.3 + 0.3,
          baseAlpha: Math.random() * 0.5 + 0.15,
          twinkleSpeed: Math.random() * 0.025 + 0.008,
          phase: Math.random() * Math.PI * 2
        });
      }

      for (let i = 0; i < 14; i++) {
        bokehs.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: Math.random() * 36 + 16,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          alpha: Math.random() * 0.055 + 0.02
        });
      }

      function renderCosmos() {
        ctx.clearRect(0, 0, starCanvas.width, starCanvas.height);

        // Warm gold bokeh orbs
        for (let i = 0; i < bokehs.length; i++) {
          const b = bokehs[i];
          b.x += b.vx;
          b.y += b.vy;
          if (b.x < -b.r) b.x = starCanvas.width + b.r;
          if (b.x > starCanvas.width + b.r) b.x = -b.r;
          if (b.y < -b.r) b.y = starCanvas.height + b.r;
          if (b.y > starCanvas.height + b.r) b.y = -b.r;

          const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          grad.addColorStop(0, `rgba(223, 192, 130, ${b.alpha})`);
          grad.addColorStop(1, 'rgba(223, 192, 130, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Twinkling fine stars
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          s.phase += s.twinkleSpeed;
          const alpha = s.baseAlpha + Math.sin(s.phase) * 0.18;
          ctx.fillStyle = `rgba(245, 236, 218, ${Math.max(0.05, alpha)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }

        requestAnimationFrame(renderCosmos);
      }
      requestAnimationFrame(renderCosmos);
    })();
