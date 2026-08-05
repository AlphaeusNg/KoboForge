        const {
            analyzePdfLayoutComplexity
        } = await import(
            `./fixed-layout.js?v=${encodeURIComponent(window.SITE_VERSION?.id || 'dev')}`
        );
        const {
            DOCX_FIDELITY_STYLE_MAP,
            detectPlainListMarker,
            normalizeBibleVerseMarkers,
            normalizeCssTypography,
            normalizeDocumentLists,
            normalizeHtmlPageBreaks,
            prepareDocxForFidelity
        } = await import(
            `./document-fidelity.js?v=${encodeURIComponent(window.SITE_VERSION?.id || 'dev')}`
        );
        const PDFJS_MODULE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
        const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
        let pdfjsLib = null;
        let pdfjsLoadPromise = null;

        async function loadPdfJs() {
            if (pdfjsLib) return pdfjsLib;
            if (!pdfjsLoadPromise) {
                pdfjsLoadPromise = import(PDFJS_MODULE_URL)
                    .then((module) => {
                        module.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
                        pdfjsLib = module;
                        return module;
                    })
                    .catch((error) => {
                        pdfjsLoadPromise = null;
                        throw error;
                    });
            }
            return pdfjsLoadPromise;
        }

        const PREFS_KEY = 'koboforge.prefs.v3';
        const LEGACY_PREFS_KEY = 'koboforge.prefs.v2';

        const dropzone = document.getElementById('dropzone');
        const dropzoneIdle = document.getElementById('dropzoneIdle');
        const dropzoneReady = document.getElementById('dropzoneReady');
        const dropzoneFileName = document.getElementById('dropzoneFileName');
        const dropzoneFileMeta = document.getElementById('dropzoneFileMeta');
        const fileInput = document.getElementById('fileInput');
        const pickFileBtn = document.getElementById('pickFileBtn');
        const replaceFileBtn = document.getElementById('replaceFileBtn');
        const cancelFileBtn = document.getElementById('cancelFileBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const clearBtn = document.getElementById('clearBtn');
        const exportEditHint = document.getElementById('exportEditHint');
        const statusEl = document.getElementById('status');
        const previewEl = document.getElementById('deviceBookContent');
        const previewWrap = document.getElementById('previewWrap');
        const bodyHtmlSource = document.getElementById('bodyHtmlSource');
        const htmlToolbar = document.getElementById('htmlToolbar');
        const editToolbar = document.getElementById('editToolbar');
        const applyHtmlBtn = document.getElementById('applyHtmlBtn');
        const cancelHtmlBtn = document.getElementById('cancelHtmlBtn');
        const insertTableBtn = document.getElementById('insertTableBtn');
        const tablePicker = document.getElementById('tablePicker');
        const tablePickerGrid = document.getElementById('tablePickerGrid');
        const tablePickerLabel = document.getElementById('tablePickerLabel');
        const imageEditControls = document.getElementById('imageEditControls');
        const imageCutBtn = document.getElementById('imageCutBtn');
        const imageCopyBtn = document.getElementById('imageCopyBtn');
        const imagePasteBtn = document.getElementById('imagePasteBtn');
        const imageDeleteBtn = document.getElementById('imageDeleteBtn');
        const imageSizeControl = document.getElementById('imageSizeControl');
        const imageSizeRange = document.getElementById('imageSizeRange');
        const imageSizeValue = document.getElementById('imageSizeValue');
        const diffPanel = document.getElementById('diffPanel');
        const diffBody = document.getElementById('diffBody');
        const diffSummary = document.getElementById('diffSummary');
        const statsEl = document.getElementById('stats');
        const diagnosticsEl = document.getElementById('diagnostics');
        const pageChips = document.getElementById('pageChips');
        const pageChipsInner = document.getElementById('pageChipsInner');
        const chapterOutlineWrap = document.getElementById('chapterOutlineWrap');
        const chapterOutline = document.getElementById('chapterOutline');
        const chapterOutlineHint = document.getElementById('chapterOutlineHint');
        const editedBadge = document.getElementById('editedBadge');
        const statFormat = document.getElementById('statFormat');
        const statWords = document.getElementById('statWords');
        const statChapters = document.getElementById('statChapters');
        const bookTitleInput = document.getElementById('bookTitle');
        const bookAuthorInput = document.getElementById('bookAuthor');
        const bookLangInput = document.getElementById('bookLang');
        const preserveTablesEl = document.getElementById('preserveTables');
        const splitChaptersEl = document.getElementById('splitChapters');
        const progressWrap = document.getElementById('progressWrap');
        const progressBar = document.getElementById('progressBar');
        const progressPct = document.getElementById('progressPct');
        const progressLabel = document.getElementById('progressLabel');
        const modeButtons = document.querySelectorAll('.mode-btn');
        const devicePreview = document.getElementById('devicePreview');
        const deviceSelect = document.getElementById('deviceSelect');
        const deviceOrientation = document.getElementById('deviceOrientation');
        const deviceFontSize = document.getElementById('deviceFontSize');
        const deviceFontValue = document.getElementById('deviceFontValue');
        const deviceMargin = document.getElementById('deviceMargin');
        const deviceMarginValue = document.getElementById('deviceMarginValue');
        const deviceChrome = document.getElementById('deviceChrome');
        const deviceSpec = document.getElementById('deviceSpec');
        const devicePhysicalSpec = document.getElementById('devicePhysicalSpec');
        const deviceFrame = document.getElementById('deviceFrame');
        const deviceScreen = document.getElementById('deviceScreen');
        const deviceReaderHeader = document.getElementById('deviceReaderHeader');
        const deviceReaderTitle = document.getElementById('deviceReaderTitle');
        const deviceReaderFooter = document.getElementById('deviceReaderFooter');
        const deviceBookViewport = document.getElementById('deviceBookViewport');
        const deviceBookContent = previewEl;
        const devicePagePrev = document.getElementById('devicePagePrev');
        const devicePageNext = document.getElementById('devicePageNext');
        const devicePageStatus = document.getElementById('devicePageStatus');
        const deviceButtonOne = document.getElementById('deviceButtonOne');
        const deviceButtonTwo = document.getElementById('deviceButtonTwo');
        const controlTooltip = document.getElementById('controlTooltip');


        /*
         * Portrait screen pixel sizes, PPI, and body dimensions below are from
         * Rakuten Kobo's published technical specifications (linked on-page).
         * screenLeftMm is the only estimated value: Kobo does not publish bezel offsets.
         */
        const KOBO_DEVICE_PROFILES = Object.freeze({
            'clara-bw': Object.freeze({
                name: 'Kobo Clara BW',
                diagonal: 6,
                screenWidth: 1072,
                screenHeight: 1448,
                ppi: 300,
                bodyWidth: 112,
                bodyHeight: 160,
                depth: 9.2,
                isColour: false,
                hasGrip: false
            }),
            'clara-colour': Object.freeze({
                name: 'Kobo Clara Colour',
                diagonal: 6,
                screenWidth: 1072,
                screenHeight: 1448,
                ppi: 300,
                colourPpi: 150,
                bodyWidth: 112,
                bodyHeight: 160,
                depth: 9.2,
                isColour: true,
                hasGrip: false
            }),
            'libra-colour': Object.freeze({
                name: 'Kobo Libra Colour',
                diagonal: 7,
                screenWidth: 1264,
                screenHeight: 1680,
                ppi: 300,
                colourPpi: 150,
                bodyWidth: 144.6,
                bodyHeight: 161,
                depth: 8.3,
                isColour: true,
                hasGrip: true,
                screenLeftMm: 8.5
            }),
            sage: Object.freeze({
                name: 'Kobo Sage',
                diagonal: 8,
                screenWidth: 1440,
                screenHeight: 1920,
                ppi: 300,
                bodyWidth: 160.5,
                bodyHeight: 181.4,
                depth: 7.6,
                isColour: false,
                hasGrip: true,
                screenLeftMm: 8.5
            }),
            'elipsa-2e': Object.freeze({
                name: 'Kobo Elipsa 2E',
                diagonal: 10.3,
                screenWidth: 1404,
                screenHeight: 1872,
                ppi: 227,
                bodyWidth: 193,
                bodyHeight: 227,
                depth: 7.5,
                isColour: false,
                hasGrip: true,
                screenLeftMm: 8.5
            })
        });

        let currentOutput = null;
        let currentFile = null;
        let bodyEdited = false;
        let editMode = 'edit'; // edit | diff | html
        let commitTimer = null;
        let devicePageIndex = 0;
        let devicePageCount = 1;
        let deviceLayoutTimer = null;
        let lockedEditPageIndex = null;
        let editPageUnlockTimer = null;
        let editViewportLockFrame = null;
        let documentImageConversionToken = 0;
        let tooltipHideTimer = null;
        let fixedLayoutRenderToken = 0;
        let fixedLayoutCache = null;
        let fixedLayoutPromise = null;
        let savedEditRange = null;
        let tableInsertionRange = null;
        let selectedEditableImage = null;
        let draggedEditableImage = null;
        let imageClipboardHtml = '';

        function tooltipTarget(node) {
            return node?.closest?.('[data-tooltip]') || null;
        }

        function hideControlTooltip() {
            clearTimeout(tooltipHideTimer);
            tooltipHideTimer = null;
            controlTooltip?.classList.remove('is-visible', 'is-below');
        }

        function showControlTooltip(target, { temporary = false } = {}) {
            if (!controlTooltip || !target?.dataset?.tooltip) return;
            clearTimeout(tooltipHideTimer);
            controlTooltip.textContent = target.dataset.tooltip;
            controlTooltip.classList.remove('is-below');
            controlTooltip.classList.add('is-visible');
            const rect = target.getBoundingClientRect();
            const halfWidth = Math.max(controlTooltip.offsetWidth / 2, 28);
            const left = Math.min(
                window.innerWidth - halfWidth - 6,
                Math.max(halfWidth + 6, rect.left + rect.width / 2)
            );
            const showBelow = rect.top < controlTooltip.offsetHeight + 12;
            controlTooltip.style.left = `${left}px`;
            controlTooltip.style.top = `${showBelow ? rect.bottom : rect.top}px`;
            controlTooltip.classList.toggle('is-below', showBelow);
            if (temporary) {
                tooltipHideTimer = setTimeout(hideControlTooltip, 1200);
            }
        }

        document.addEventListener('pointerover', (event) => {
            if (event.pointerType === 'touch') return;
            const target = tooltipTarget(event.target);
            if (target) showControlTooltip(target);
        });
        document.addEventListener('pointerout', (event) => {
            if (event.pointerType === 'touch') return;
            const target = tooltipTarget(event.target);
            if (target && !target.contains(event.relatedTarget)) hideControlTooltip();
        });
        document.addEventListener('focusin', (event) => {
            const target = tooltipTarget(event.target);
            if (target) showControlTooltip(target);
        });
        document.addEventListener('focusout', (event) => {
            if (tooltipTarget(event.target)) hideControlTooltip();
        });
        document.addEventListener('pointerdown', (event) => {
            if (event.pointerType !== 'touch') return;
            const target = tooltipTarget(event.target);
            if (target) showControlTooltip(target, { temporary: true });
        });
        document.addEventListener('scroll', hideControlTooltip, true);

        // —— Preferences ——
        function loadPrefs() {
            try {
                const currentRaw = localStorage.getItem(PREFS_KEY);
                const raw = currentRaw || localStorage.getItem(LEGACY_PREFS_KEY);
                if (!raw) return;
                const p = JSON.parse(raw);
                const fromLegacy = !currentRaw;
                if (typeof p.preserveTables === 'boolean' && preserveTablesEl) preserveTablesEl.checked = p.preserveTables;
                if (typeof p.splitChapters === 'boolean' && splitChaptersEl) splitChaptersEl.checked = p.splitChapters;
                if (p.author && bookAuthorInput && !bookAuthorInput.value) bookAuthorInput.value = p.author;
                if (p.lang && bookLangInput) bookLangInput.value = p.lang;
                // v2 defaulted to Clara; reset legacy users to the new Libra Colour default.
                if (!fromLegacy && p.device && KOBO_DEVICE_PROFILES[p.device] && deviceSelect) deviceSelect.value = p.device;
                if (p.deviceOrientation && deviceOrientation) deviceOrientation.value = p.deviceOrientation;
                if (Number.isFinite(Number(p.deviceFontSize)) && deviceFontSize) deviceFontSize.value = p.deviceFontSize;
                if (Number.isFinite(Number(p.deviceMargin)) && deviceMargin) deviceMargin.value = p.deviceMargin;
                if (typeof p.deviceChrome === 'boolean' && deviceChrome) deviceChrome.checked = p.deviceChrome;
            } catch (_) { /* ignore */ }
        }

        function savePrefs() {
            try {
                localStorage.setItem(PREFS_KEY, JSON.stringify({
                    preserveTables: !!preserveTablesEl?.checked,
                    splitChapters: !!splitChaptersEl?.checked,
                    author: bookAuthorInput?.value?.trim() || '',
                    lang: bookLangInput?.value?.trim() || 'en',
                    device: deviceSelect?.value || 'libra-colour',
                    deviceOrientation: deviceOrientation?.value || 'portrait',
                    deviceFontSize: Number(deviceFontSize?.value || 3.6),
                    deviceMargin: Number(deviceMargin?.value || 8),
                    deviceChrome: !!deviceChrome?.checked
                }));
            } catch (_) { /* ignore */ }
        }

        loadPrefs();

        bookAuthorInput?.addEventListener('change', savePrefs);
        bookLangInput?.addEventListener('change', savePrefs);

        preserveTablesEl?.addEventListener('change', () => {
            savePrefs();
            if (!currentFile) return;
            if (bodyEdited) {
                const ok = confirm('Re-extracting will discard your body edits. Continue?');
                if (!ok) {
                    preserveTablesEl.checked = !preserveTablesEl.checked;
                    return;
                }
            }
            processFile(currentFile);
        });

        splitChaptersEl?.addEventListener('change', () => {
            savePrefs();
            if (currentOutput) {
                syncBodyFromUi();
                refreshOutlineAndStats();
                paintPreview({ force: true });
                statusEl.textContent = `${conciseReadyStatus()} · ${
                    splitChaptersEl.checked ? 'H1 sections' : 'one section'
                }`;
            }
        });

        /** Always reflowable — every document stays editable in preview and export. */
        function resolvedEpubLayout() {
            return 'reflowable';
        }

        function conciseReadyStatus(output = currentOutput) {
            if (!output) return 'Waiting for a document.';
            return `${output.formatLabel || 'Document'} ready · editable · ${selectedDeviceProfile().name}`;
        }

        function clearFixedLayoutCache() {
            fixedLayoutRenderToken += 1;
            fixedLayoutCache?.pages?.forEach((page) => {
                if (page.previewUrl) URL.revokeObjectURL(page.previewUrl);
            });
            fixedLayoutCache = null;
            fixedLayoutPromise = null;
        }

        function updateEpubLayoutUi() {
            // Fixed-layout mode was removed: Edit / Diff / HTML and text controls stay enabled.
            modeButtons.forEach((button) => {
                button.disabled = false;
                button.setAttribute('aria-disabled', 'false');
            });
            [deviceFontSize, deviceMargin, splitChaptersEl].forEach((control) => {
                if (control) control.disabled = false;
            });
        }

        updateEpubLayoutUi();

        // —— Preview modes ——
        modeButtons.forEach((btn) => {
            btn.addEventListener('click', () => setEditMode(btn.dataset.mode));
        });

        function setEditMode(mode) {
            if (!['edit', 'diff', 'html'].includes(mode)) mode = 'edit';
            if (!currentOutput) {
                statusEl.textContent = 'Load a document first.';
                return;
            }
            // Always flush UI → model before leaving a surface that can hold edits
            if (editMode === 'edit' || editMode === 'html') {
                syncBodyFromUi();
            }
            releaseEditablePageLock();

            editMode = mode;
            modeButtons.forEach((b) => {
                const active = b.dataset.mode === mode;
                b.classList.toggle('active', active);
                b.classList.toggle('text-slate-300', active);
                b.classList.toggle('text-slate-400', !active);
                b.setAttribute('aria-pressed', String(active));
            });

            previewWrap?.classList.remove('mode-edit', 'mode-diff', 'mode-html');
            previewWrap?.classList.add(`mode-${mode}`);

            const isHtml = mode === 'html';
            const isEdit = mode === 'edit';
            const isDiff = mode === 'diff';
            const isDeviceSurface = isEdit || isDiff;

            devicePreview?.classList.toggle('hidden', !isDeviceSurface);
            bodyHtmlSource.classList.toggle('hidden', !isHtml);
            htmlToolbar?.classList.toggle('hidden', !isHtml);
            editToolbar?.classList.toggle('hidden', !isEdit);
            diffPanel?.classList.toggle('hidden', !isDiff);

            previewEl.contentEditable = isEdit ? 'true' : 'false';
            previewEl.classList.toggle('kf-editing', isEdit);
            previewEl.classList.toggle('kf-diffing', isDiff);
            if (isEdit) {
                previewEl.setAttribute(
                    'aria-label',
                    'Editable paginated Kobo document'
                );
                previewEl.focus();
            } else if (isDiff) {
                previewEl.setAttribute(
                    'aria-label',
                    'Paginated Kobo document showing text, formatting, object, and placement changes'
                );
            } else {
                previewEl.removeAttribute('aria-label');
            }

            if (isHtml && currentOutput) {
                bodyHtmlSource.value = prettyPrintHtml(currentOutput.bodyHtml);
            }
            if (isDeviceSurface) {
                // Edit and Diff share one reader. Keep the current Kobo page.
                renderDevicePreview();
            }
            if (isDiff) renderDiffPanel();
            updateEditChrome();
        }

        function selectedDeviceProfile(selectEl = deviceSelect) {
            return KOBO_DEVICE_PROFILES[selectEl?.value] || KOBO_DEVICE_PROFILES['libra-colour'];
        }

        function deviceGeometry(profile, orientation = 'portrait') {
            const portraitScreenWidthMm = (profile.screenWidth / profile.ppi) * 25.4;
            const portraitScreenHeightMm = (profile.screenHeight / profile.ppi) * 25.4;
            const portraitLeftMm = Number.isFinite(profile.screenLeftMm)
                ? profile.screenLeftMm
                : (profile.bodyWidth - portraitScreenWidthMm) / 2;
            const portraitTopMm = (profile.bodyHeight - portraitScreenHeightMm) / 2;

            if (orientation === 'landscape') {
                return {
                    bodyWidthMm: profile.bodyHeight,
                    bodyHeightMm: profile.bodyWidth,
                    screenWidthMm: portraitScreenHeightMm,
                    screenHeightMm: portraitScreenWidthMm,
                    // Physical clockwise rotation of the published portrait body.
                    screenLeftMm: profile.bodyHeight - portraitTopMm - portraitScreenHeightMm,
                    screenTopMm: portraitLeftMm,
                    screenWidthPx: profile.screenHeight,
                    screenHeightPx: profile.screenWidth
                };
            }
            return {
                bodyWidthMm: profile.bodyWidth,
                bodyHeightMm: profile.bodyHeight,
                screenWidthMm: portraitScreenWidthMm,
                screenHeightMm: portraitScreenHeightMm,
                screenLeftMm: portraitLeftMm,
                screenTopMm: portraitTopMm,
                screenWidthPx: profile.screenWidth,
                screenHeightPx: profile.screenHeight
            };
        }

        function applyDeviceGeometry() {
            if (!deviceFrame || !deviceScreen) return null;
            const profile = selectedDeviceProfile();
            const orientation = deviceOrientation?.value || 'portrait';
            const geometry = deviceGeometry(profile, orientation);
            const bodyW = geometry.bodyWidthMm;
            const bodyH = geometry.bodyHeightMm;
            const cssPxPerMm = 3.2;
            const widestBodyMm = Math.max(
                ...Object.values(KOBO_DEVICE_PROFILES).map((candidate) => (
                    orientation === 'landscape'
                        ? candidate.bodyHeight
                        : candidate.bodyWidth
                ))
            );

            deviceFrame.style.aspectRatio = `${bodyW} / ${bodyH}`;
            deviceFrame.style.setProperty('--device-css-width', `${bodyW * cssPxPerMm}px`);
            deviceFrame.style.setProperty(
                '--device-relative-width',
                `${(bodyW / widestBodyMm) * 100}%`
            );
            deviceFrame.style.setProperty('--device-radius', `${Math.max(8, bodyW * 0.065)}px`);
            deviceFrame.classList.toggle('has-grip', profile.hasGrip);
            deviceFrame.classList.toggle('is-colour', profile.isColour);
            deviceFrame.classList.toggle('orientation-landscape', orientation === 'landscape');

            deviceScreen.style.left = `${(geometry.screenLeftMm / bodyW) * 100}%`;
            deviceScreen.style.top = `${(geometry.screenTopMm / bodyH) * 100}%`;
            deviceScreen.style.width = `${(geometry.screenWidthMm / bodyW) * 100}%`;
            deviceScreen.style.height = `${(geometry.screenHeightMm / bodyH) * 100}%`;

            const showButtons = !!profile.hasGrip;
            [deviceButtonOne, deviceButtonTwo].forEach((button) => {
                button?.classList.toggle('hidden', !showButtons);
            });
            if (showButtons) {
                if (orientation === 'landscape') {
                    Object.assign(deviceButtonOne.style, {
                        width: '11%', height: '3.5%', left: '35%', top: 'auto', right: 'auto', bottom: '4%'
                    });
                    Object.assign(deviceButtonTwo.style, {
                        width: '11%', height: '3.5%', left: '53%', top: 'auto', right: 'auto', bottom: '4%'
                    });
                } else {
                    Object.assign(deviceButtonOne.style, {
                        width: '3.5%', height: '11%', left: 'auto', top: '35%', right: '7%', bottom: 'auto'
                    });
                    Object.assign(deviceButtonTwo.style, {
                        width: '3.5%', height: '11%', left: 'auto', top: '53%', right: '7%', bottom: 'auto'
                    });
                }
            }

            const colourBit = profile.isColour
                ? ` · ${profile.colourPpi} ppi colour`
                : ' · B&W';
            if (deviceSpec) {
                deviceSpec.textContent = `${profile.diagonal}″ · ${geometry.screenWidthPx}×${geometry.screenHeightPx} · ${profile.ppi} ppi${colourBit}`;
            }
            if (devicePhysicalSpec) {
                devicePhysicalSpec.textContent = `${bodyW.toFixed(bodyW % 1 ? 1 : 0)}×${bodyH.toFixed(bodyH % 1 ? 1 : 0)} mm body · ${orientation}`;
            }
            deviceFrame.setAttribute(
                'aria-label',
                `${profile.name}, ${orientation}, ${geometry.screenWidthPx} by ${geometry.screenHeightPx} screen`
            );
            return { profile, geometry };
        }

        function updateDeviceControlLabels() {
            const fontMm = Number(deviceFontSize?.value || 3.6);
            const marginMm = Number(deviceMargin?.value || 8);
            if (deviceFontValue) deviceFontValue.textContent = `${(fontMm * 2.83465).toFixed(0)} pt`;
            if (deviceMarginValue) deviceMarginValue.textContent = `${marginMm.toFixed(0)} mm`;
        }

        function renderDevicePreview({ resetPage = false } = {}) {
            if (!devicePreview || !deviceBookContent) return;
            if (resetPage) devicePageIndex = 0;
            resetDeviceViewportScroll();
            updateDeviceControlLabels();
            const applied = applyDeviceGeometry();
            if (!applied) return;

            const title = bookTitleInput?.value?.trim() || currentOutput?.title || 'KoboForge preview';
            const lang = bookLangInput?.value?.trim() || 'en';
            let renderedBody = '<h1>KoboForge</h1><p>Load a document to preview its converted EPUB body on this device.</p>';
            const fixedPreview = !!currentOutput && resolvedEpubLayout() === 'fixed';
            if (fixedPreview) {
                const cacheMatches = fixedLayoutCache?.file === currentFile;
                const fixedPages = cacheMatches ? fixedLayoutCache.pages : [];
                renderedBody = fixedPages?.length
                    ? fixedPages.map((page, index) => (
                        `<section class="kf-fixed-preview-page" aria-label="Source PDF page ${index + 1}">`
                        + `<img src="${page.previewUrl}" alt="Exact visual layout of source PDF page ${index + 1}">`
                        + '</section>'
                    )).join('')
                    : '<p class="kf-fixed-preview-loading">Rendering exact PDF pages for the fixed-layout preview…</p>';
            }
            if (currentOutput) {
                if (!fixedPreview) {
                    renderedBody = prepareHtmlForEpub(
                        canonicalizeBody(currentOutput.bodyHtml, { forExport: true })
                    );
                }
            }
            if (currentOutput && editMode === 'diff' && !fixedPreview) {
                const tracked = buildTrackChangesDocument(
                    currentOutput.originalBodyHtml || '',
                    currentOutput.bodyHtml || ''
                );
                currentOutput._diffNav = tracked.navItems;
                paintDiffNavList(tracked);
                renderedBody = tracked.html || '<p class="kf-tc-empty">No changes yet.</p>';
            }
            if (deviceReaderTitle) deviceReaderTitle.textContent = title;
            deviceBookContent.lang = lang;
            deviceBookContent.innerHTML = renderedBody || '<p>(Empty document)</p>';
            selectedEditableImage = null;
            draggedEditableImage = null;
            savedEditRange = null;
            tableInsertionRange = null;
            closeTablePicker();
            deviceBookContent.contentEditable = editMode === 'edit' && !fixedPreview ? 'true' : 'false';
            deviceBookContent.classList.toggle('kf-editing', editMode === 'edit' && !fixedPreview);
            deviceBookContent.classList.toggle('kf-diffing', editMode === 'diff' && !fixedPreview);
            deviceBookContent.classList.toggle('kf-fixed-preview', fixedPreview);
            editToolbar?.classList.toggle('hidden', editMode !== 'edit' || fixedPreview);
            configureEditableImages();
            deviceBookContent.querySelectorAll('.kf-note-space').forEach((space) => {
                // Keep intentional space from collapsing during ordinary text
                // edits. Advanced users can resize/remove it in HTML mode.
                space.setAttribute('contenteditable', 'false');
                space.setAttribute('title', 'Preserved blank space (resize in HTML mode)');
            });
            deviceBookContent.querySelectorAll('.kf-page-break, .kf-blank-page').forEach((pageBreak) => {
                pageBreak.setAttribute('contenteditable', 'false');
                pageBreak.setAttribute('role', 'separator');
                pageBreak.setAttribute(
                    'aria-label',
                    pageBreak.classList.contains('kf-blank-page') ? 'Blank page' : 'Page break'
                );
            });
            deviceBookContent.querySelectorAll('img').forEach((img) => {
                if (!img.complete) img.addEventListener('load', () => scheduleDevicePagination(), { once: true });
            });
            if (fixedPreview && !fixedLayoutCache?.pages?.length) {
                ensureFixedLayoutPages().then(() => {
                    if (currentOutput && resolvedEpubLayout() === 'fixed') {
                        renderDevicePreview({ resetPage });
                    }
                }).catch((error) => {
                    console.error('[KoboForge] Fixed preview', error);
                    statusEl.textContent = error.message || 'Could not render the fixed-layout preview.';
                });
            }
            scheduleDevicePagination();
            savePrefs();
        }

        function scheduleDevicePagination() {
            clearTimeout(deviceLayoutTimer);
            deviceLayoutTimer = setTimeout(layoutDevicePages, 30);
        }

        function resetDeviceViewportScroll() {
            if (!deviceBookViewport) return;
            if (deviceBookViewport.scrollLeft) deviceBookViewport.scrollLeft = 0;
            if (deviceBookViewport.scrollTop) deviceBookViewport.scrollTop = 0;
        }

        function releaseEditablePageLock() {
            clearTimeout(editPageUnlockTimer);
            editPageUnlockTimer = null;
            if (editViewportLockFrame !== null) {
                cancelAnimationFrame(editViewportLockFrame);
                editViewportLockFrame = null;
            }
            lockedEditPageIndex = null;
            resetDeviceViewportScroll();
            if (deviceBookContent) deviceBookContent.style.transition = '';
        }

        function pinEditableViewport() {
            if (
                editMode !== 'edit'
                || lockedEditPageIndex === null
                || !deviceBookContent
            ) {
                return;
            }
            devicePageIndex = Math.max(
                0,
                Math.min(lockedEditPageIndex, Math.max(0, devicePageCount - 1))
            );
            resetDeviceViewportScroll();
            const pageWidth = Number(deviceBookContent.dataset.pageWidth || 0);
            if (pageWidth) {
                deviceBookContent.style.transition = 'none';
                deviceBookContent.style.transform = `translate3d(${-devicePageIndex * pageWidth}px,0,0)`;
            }
        }

        function beginEditablePageLock() {
            if (editMode !== 'edit' || !currentOutput || !deviceBookContent) return;
            if (lockedEditPageIndex === null) lockedEditPageIndex = devicePageIndex;
            clearTimeout(editPageUnlockTimer);
            if (editViewportLockFrame !== null) cancelAnimationFrame(editViewportLockFrame);
            pinEditableViewport();
            // Chromium may scroll an overflow:hidden contenteditable after the
            // input event to reveal its caret. Re-pin across two paint frames.
            editViewportLockFrame = requestAnimationFrame(() => {
                pinEditableViewport();
                editViewportLockFrame = requestAnimationFrame(() => {
                    pinEditableViewport();
                    editViewportLockFrame = null;
                });
            });
            // Keep the lock through the debounced model sync + repagination.
            editPageUnlockTimer = setTimeout(() => {
                pinEditableViewport();
                lockedEditPageIndex = null;
                editPageUnlockTimer = null;
                resetDeviceViewportScroll();
                if (deviceBookContent) deviceBookContent.style.transition = '';
            }, 260);
        }

        function layoutDevicePages() {
            if (!deviceBookViewport || !deviceBookContent || !deviceScreen) return;
            if (devicePreview?.classList.contains('hidden')) return;
            const applied = applyDeviceGeometry();
            if (!applied) return;

            const screenWidth = deviceScreen.clientWidth;
            const geometry = applied.geometry;
            if (!screenWidth || !geometry.screenWidthMm) {
                scheduleDevicePagination();
                return;
            }
            const cssPxPerMm = screenWidth / geometry.screenWidthMm;
            const fixedPreview = deviceBookContent.classList.contains('kf-fixed-preview');
            const fontMm = Number(deviceFontSize?.value || 3.6);
            const marginMm = fixedPreview ? 0 : Number(deviceMargin?.value || 8);
            const showChrome = !!deviceChrome?.checked;
            const contentTopMm = 7;
            const contentBottomMm = showChrome ? 7 : 3.5;
            const chromeOffsetMm = 2.5;

            deviceScreen.style.setProperty('--reader-margin', `${marginMm * cssPxPerMm}px`);
            deviceScreen.style.setProperty('--reader-content-top', `${contentTopMm * cssPxPerMm}px`);
            deviceScreen.style.setProperty('--reader-content-bottom', `${contentBottomMm * cssPxPerMm}px`);
            deviceScreen.style.setProperty('--reader-chrome-offset', `${chromeOffsetMm * cssPxPerMm}px`);
            deviceScreen.style.setProperty('--reader-chrome-size', `${1.9 * cssPxPerMm}px`);
            deviceReaderHeader.classList.remove('hidden');
            deviceReaderTitle?.classList.toggle('hidden', !showChrome);
            deviceReaderFooter.classList.toggle('hidden', !showChrome);
            deviceBookContent.style.fontSize = `${fontMm * cssPxPerMm}px`;
            deviceBookContent.style.setProperty('--reader-line-height', '1.52');

            // Let the absolute insets settle before reading the content viewport.
            requestAnimationFrame(() => {
                const pageWidth = Math.max(1, Math.floor(deviceBookViewport.clientWidth));
                const pageHeight = Math.max(1, Math.floor(deviceBookViewport.clientHeight));
                deviceBookContent.style.setProperty('--reader-page-height', `${pageHeight}px`);
                const fixedPageCount = fixedPreview
                    ? Math.max(1, deviceBookContent.querySelectorAll('.kf-fixed-preview-page').length)
                    : 1;
                deviceBookContent.style.width = `${pageWidth * fixedPageCount}px`;
                deviceBookContent.style.height = `${pageHeight}px`;
                deviceBookContent.style.columnWidth = fixedPreview ? 'auto' : `${pageWidth}px`;
                deviceBookContent.style.columnGap = fixedPreview ? 'normal' : '0px';
                deviceBookContent.style.display = fixedPreview ? 'flex' : 'block';
                if (fixedPreview) {
                    deviceBookContent.querySelectorAll('.kf-fixed-preview-page').forEach((page) => {
                        page.style.width = `${pageWidth}px`;
                        page.style.height = `${pageHeight}px`;
                    });
                }

                requestAnimationFrame(() => {
                    const fullWidth = Math.max(pageWidth, deviceBookContent.scrollWidth);
                    devicePageCount = fixedPreview
                        ? fixedPageCount
                        : Math.max(1, Math.ceil((fullWidth - 0.5) / pageWidth));
                    const requestedPage = (
                        editMode === 'edit' && lockedEditPageIndex !== null
                    )
                        ? lockedEditPageIndex
                        : devicePageIndex;
                    devicePageIndex = Math.max(
                        0,
                        Math.min(requestedPage, devicePageCount - 1)
                    );
                    deviceBookContent.dataset.pageWidth = String(pageWidth);
                    updateDevicePage({ animate: false });
                });
            });
        }

        function updateDevicePage({ animate = true } = {}) {
            const pageWidth = Number(deviceBookContent?.dataset.pageWidth || 0);
            if (editMode === 'edit' && lockedEditPageIndex !== null) {
                devicePageIndex = lockedEditPageIndex;
            }
            devicePageIndex = Math.max(0, Math.min(devicePageIndex, Math.max(0, devicePageCount - 1)));
            resetDeviceViewportScroll();
            if (deviceBookContent && pageWidth) {
                if (!animate) deviceBookContent.style.transition = 'none';
                deviceBookContent.style.transform = `translate3d(${-devicePageIndex * pageWidth}px,0,0)`;
                if (!animate) {
                    requestAnimationFrame(() => {
                        resetDeviceViewportScroll();
                        if (deviceBookContent && lockedEditPageIndex === null) {
                            deviceBookContent.style.transition = '';
                        }
                    });
                }
            }
            const label = `Page ${devicePageIndex + 1} of ${devicePageCount}`;
            if (devicePageStatus) devicePageStatus.textContent = label;
            if (deviceReaderFooter) deviceReaderFooter.textContent = label;
            if (devicePagePrev) devicePagePrev.disabled = devicePageIndex <= 0;
            if (devicePageNext) devicePageNext.disabled = devicePageIndex >= devicePageCount - 1;
        }

        [deviceSelect, deviceOrientation].forEach((control) => {
            control?.addEventListener('change', async () => {
                releaseEditablePageLock();
                savePrefs();
                const output = currentOutput;
                if (output) {
                    const fixedPreview = resolvedEpubLayout() === 'fixed';
                    if (editMode === 'edit' && !fixedPreview) syncBodyFromUi();
                    const imagesRetargeted = fixedPreview
                        ? false
                        : await retargetCurrentDocumentImages();
                    if (currentOutput !== output) return;
                    if (imagesRetargeted) refreshOutlineAndStats();
                    if (fixedPreview) {
                        clearFixedLayoutCache();
                        await ensureFixedLayoutPages();
                        if (currentOutput !== output) return;
                    }
                    statusEl.textContent = conciseReadyStatus();
                }
                renderDevicePreview({ resetPage: true });
                // The device frame animates width/aspect-ratio for 200 ms.
                // Re-measure once more after that transition fully settles.
                setTimeout(scheduleDevicePagination, 240);
            });
        });
        deviceChrome?.addEventListener('change', () => {
            releaseEditablePageLock();
            savePrefs();
            renderDevicePreview({ resetPage: true });
        });
        [deviceFontSize, deviceMargin].forEach((control) => {
            control?.addEventListener('input', () => {
                releaseEditablePageLock();
                updateDeviceControlLabels();
                devicePageIndex = 0;
                if (currentOutput && editMode === 'edit') syncBodyFromUi();
                renderDevicePreview({ resetPage: true });
                scheduleDevicePagination();
                savePrefs();
            });
        });
        devicePagePrev?.addEventListener('click', () => {
            releaseEditablePageLock();
            devicePageIndex -= 1;
            updateDevicePage();
        });
        devicePageNext?.addEventListener('click', () => {
            releaseEditablePageLock();
            devicePageIndex += 1;
            updateDevicePage();
        });
        devicePreview?.addEventListener('keydown', (event) => {
            if (editMode === 'edit' && deviceBookContent?.contains(event.target)) return;
            if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
                event.preventDefault();
                releaseEditablePageLock();
                devicePageIndex -= 1;
                updateDevicePage();
            } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
                event.preventDefault();
                releaseEditablePageLock();
                devicePageIndex += 1;
                updateDevicePage();
            }
        });
        window.addEventListener('resize', () => {
            if (editMode === 'edit' || editMode === 'diff') scheduleDevicePagination();
        });
        deviceFrame?.addEventListener('transitionend', (event) => {
            if (event.propertyName === 'width' || event.propertyName === 'aspect-ratio') {
                scheduleDevicePagination();
            }
        });
        // Device changes animate the frame for 200 ms. Measure every settled
        // viewport size instead of keeping a stale column width from mid-transition.
        if (typeof ResizeObserver === 'function' && deviceBookViewport) {
            let observedViewportWidth = 0;
            let observedViewportHeight = 0;
            const viewportResizeObserver = new ResizeObserver((entries) => {
                const box = entries[0]?.contentRect;
                const width = Math.round(box?.width || 0);
                const height = Math.round(box?.height || 0);
                if (
                    !width
                    || !height
                    || (width === observedViewportWidth && height === observedViewportHeight)
                ) {
                    return;
                }
                observedViewportWidth = width;
                observedViewportHeight = height;
                if (editMode === 'edit' || editMode === 'diff') {
                    scheduleDevicePagination();
                }
            });
            viewportResizeObserver.observe(deviceBookViewport);
        }
        updateDeviceControlLabels();
        applyDeviceGeometry();

        function canFormatNow() {
            return editMode === 'edit' && !!currentOutput && previewEl?.isContentEditable;
        }

        function canEditImagesNow() {
            return canFormatNow() && resolvedEpubLayout() !== 'fixed';
        }

        function rangeLivesInPreview(range) {
            if (!range || !previewEl) return false;
            const container = range.commonAncestorContainer;
            return container === previewEl || previewEl.contains(container);
        }

        function editableImageUnit(img) {
            if (!img || !previewEl?.contains(img)) return null;
            const figure = img.closest('figure.kf-document-image');
            if (figure && previewEl.contains(figure)) return figure;
            const paragraph = img.parentElement?.closest?.('p');
            if (
                paragraph
                && previewEl.contains(paragraph)
                && paragraph.querySelectorAll('img').length === 1
                && !(paragraph.textContent || '').trim()
                && Array.from(paragraph.children).every((child) => (
                    child === img || child.tagName === 'BR'
                ))
            ) {
                return paragraph;
            }
            return img;
        }

        function normalizedImageWidth(img) {
            const stored = Number(img?.getAttribute('data-kf-width'));
            const figure = img?.closest?.('figure.kf-document-image');
            const styled = Number.parseFloat(
                figure?.style?.width
                || img?.style?.width
                || ''
            );
            const value = Number.isFinite(stored) && stored > 0
                ? stored
                : (Number.isFinite(styled) && styled > 0 ? styled : 100);
            return Math.max(25, Math.min(100, Math.round(value / 5) * 5));
        }

        function normalizedImageLayout(img) {
            const stored = img?.getAttribute('data-kf-layout') || '';
            if (['block', 'inline-left', 'inline-right'].includes(stored)) return stored;
            const unit = img?.closest?.('figure.kf-document-image') || img;
            if (unit?.classList?.contains('kf-image-inline-right')) return 'inline-right';
            if (unit?.classList?.contains('kf-image-inline-left')) return 'inline-left';
            const textParagraph = img?.closest?.('p');
            return textParagraph && (textParagraph.textContent || '').trim()
                ? 'inline-left'
                : 'block';
        }

        function imageWidthForPageFit({
            pixelWidth,
            pixelHeight,
            fitHeightPercent = 72,
            imageCount = 1,
            layout = 'block',
            target = documentImageTarget()
        } = {}) {
            const width = Math.max(1, Number(pixelWidth) || 1);
            const height = Math.max(1, Number(pixelHeight) || 1);
            const count = Math.max(1, Math.round(Number(imageCount) || 1));
            const availableRatio = Math.max(
                0.2,
                Math.min(0.92, (Number(fitHeightPercent) || 72) / 100)
            );
            const perImageHeight = Math.max(
                0.18,
                (availableRatio - (Math.max(0, count - 1) * 0.035)) / count
            );
            const naturalWidthPercent = (
                target.height
                * perImageHeight
                * (width / height)
                / Math.max(1, target.width)
            ) * 100;
            const maximum = layout === 'block' ? 100 : 60;
            return Math.max(
                25,
                Math.min(maximum, Math.floor(naturalWidthPercent / 5) * 5 || 25)
            );
        }

        function applyImageLayoutPresentation(img) {
            if (!img) return;
            const layout = normalizedImageLayout(img);
            const width = normalizedImageWidth(img);
            const figure = img.closest?.('figure.kf-document-image');
            const unit = figure || img;
            [unit, img].forEach((element) => {
                element?.classList?.remove(
                    'kf-image-block',
                    'kf-image-inline-left',
                    'kf-image-inline-right'
                );
            });
            unit.classList.add(`kf-image-${layout}`);
            img.setAttribute('data-kf-layout', layout);
            img.setAttribute('data-kf-width', String(width));
            if (figure && layout !== 'block') {
                figure.style.width = `${width}%`;
                img.style.width = '100%';
            } else {
                figure?.style?.removeProperty('width');
                img.style.width = `${width}%`;
            }
        }

        function updateImageEditControls({ reveal = false } = {}) {
            if (!imageEditControls) return;
            const hasSelection = !!(
                selectedEditableImage
                && previewEl?.contains(selectedEditableImage)
                && selectedEditableImage.classList.contains('kf-editable-image')
            );
            const hasClipboardImage = !!imageClipboardHtml;
            imageEditControls.classList.toggle('hidden', !hasSelection && !hasClipboardImage);
            if (imageCutBtn) imageCutBtn.disabled = !hasSelection;
            if (imageCopyBtn) imageCopyBtn.disabled = !hasSelection;
            if (imageDeleteBtn) imageDeleteBtn.disabled = !hasSelection;
            if (imagePasteBtn) imagePasteBtn.disabled = !hasClipboardImage;
            imageSizeControl?.classList.toggle('hidden', !hasSelection);
            if (hasSelection && imageSizeRange) {
                const width = normalizedImageWidth(selectedEditableImage);
                imageSizeRange.max = normalizedImageLayout(selectedEditableImage) === 'block'
                    ? '100'
                    : '60';
                imageSizeRange.value = String(width);
                if (imageSizeValue) imageSizeValue.textContent = `${width}%`;
            }
            imageEditControls.querySelectorAll('[data-image-layout]').forEach((button) => {
                button.disabled = !hasSelection;
                button.classList.toggle(
                    'is-active',
                    hasSelection
                    && button.dataset.imageLayout === normalizedImageLayout(selectedEditableImage)
                );
            });
            if (reveal && !imageEditControls.classList.contains('hidden')) {
                const lane = editToolbar?.querySelector('[data-toolbar-row="objects"]');
                if (lane) lane.scrollLeft = 0;
            }
        }

        function clearEditableImageSelection() {
            if (selectedEditableImage) {
                selectedEditableImage.classList.remove('kf-image-selected');
                selectedEditableImage.setAttribute('aria-selected', 'false');
            }
            selectedEditableImage = null;
            updateImageEditControls();
        }

        function selectEditableImage(img, { focus = true, reveal = true } = {}) {
            if (!canEditImagesNow() || !img?.classList.contains('kf-editable-image')) return false;
            if (selectedEditableImage && selectedEditableImage !== img) {
                selectedEditableImage.classList.remove('kf-image-selected');
                selectedEditableImage.setAttribute('aria-selected', 'false');
            }
            selectedEditableImage = img;
            img.classList.add('kf-image-selected');
            img.setAttribute('aria-selected', 'true');
            const selection = window.getSelection();
            if (selection) {
                const range = document.createRange();
                range.selectNode(img);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            if (focus) previewEl.focus({ preventScroll: true });
            updateImageEditControls({ reveal });
            return true;
        }

        function configureEditableImages() {
            if (!previewEl) return;
            const editable = canEditImagesNow();
            previewEl.querySelectorAll('img').forEach((img) => {
                img.classList.toggle('kf-editable-image', editable);
                img.classList.remove('kf-image-selected', 'kf-image-dragging');
                const width = normalizedImageWidth(img);
                img.setAttribute('data-kf-width', String(width));
                applyImageLayoutPresentation(img);
                if (editable) {
                    img.tabIndex = 0;
                    img.draggable = true;
                    img.setAttribute('aria-selected', 'false');
                    img.setAttribute('data-tooltip', 'Select or drag image to move it');
                    img.title = 'Select or drag image to move it';
                } else {
                    ['tabindex', 'draggable', 'aria-selected', 'data-tooltip', 'title'].forEach((name) => {
                        img.removeAttribute(name);
                    });
                }
            });
            updateImageEditControls();
        }

        function finishImageEdit(message) {
            if (!currentOutput || !previewEl) return;
            currentOutput.imageCount = previewEl.querySelectorAll('img[data-kf-image-id]').length;
            beginEditablePageLock();
            markEdited();
            clearTimeout(commitTimer);
            commitTimer = setTimeout(refreshDiffLive, 80);
            scheduleDevicePagination();
            if (message) statusEl.textContent = message;
        }

        function resizeSelectedImage(width) {
            if (!selectedEditableImage || !previewEl?.contains(selectedEditableImage)) return;
            const maximum = normalizedImageLayout(selectedEditableImage) === 'block' ? 100 : 60;
            const normalized = Math.max(
                25,
                Math.min(maximum, Math.round(Number(width || maximum) / 5) * 5)
            );
            selectedEditableImage.setAttribute('data-kf-width', String(normalized));
            selectedEditableImage.setAttribute('data-kf-width-mode', 'user');
            applyImageLayoutPresentation(selectedEditableImage);
            if (imageSizeRange) imageSizeRange.value = String(normalized);
            if (imageSizeValue) imageSizeValue.textContent = `${normalized}%`;
            finishImageEdit(`Image width set to ${normalized}%.`);
        }

        function setSelectedImageLayout(layout) {
            if (
                !selectedEditableImage
                || !previewEl?.contains(selectedEditableImage)
                || !['block', 'inline-left', 'inline-right'].includes(layout)
            ) return;
            selectedEditableImage.setAttribute('data-kf-layout', layout);
            selectedEditableImage.setAttribute('data-kf-layout-mode', 'user');
            if (layout !== 'block' && normalizedImageWidth(selectedEditableImage) > 60) {
                selectedEditableImage.setAttribute('data-kf-width', '60');
                selectedEditableImage.setAttribute('data-kf-width-mode', 'user');
            }
            applyImageLayoutPresentation(selectedEditableImage);
            updateImageEditControls();
            const message = layout === 'block'
                ? 'Image moved to its own row.'
                : `Image inlined on the ${layout.endsWith('right') ? 'right' : 'left'}.`;
            finishImageEdit(message);
        }

        function cleanImageClipboardMarkup(img) {
            if (!img) return '';
            const clone = img.cloneNode(true);
            clone.classList.remove('kf-editable-image', 'kf-image-selected', 'kf-image-dragging');
            if (!clone.className) clone.removeAttribute('class');
            ['tabindex', 'draggable', 'aria-selected', 'data-tooltip', 'title'].forEach((name) => {
                clone.removeAttribute(name);
            });
            return clone.outerHTML;
        }

        function putImageOnClipboard(event, img = selectedEditableImage) {
            const markup = cleanImageClipboardMarkup(img);
            if (!markup) return false;
            imageClipboardHtml = markup;
            if (event?.clipboardData) {
                event.clipboardData.setData('text/html', markup);
                event.clipboardData.setData('text/plain', img.getAttribute('alt') || 'Document image');
                try {
                    event.clipboardData.setData('application/x-koboforge-image', markup);
                } catch (_) { /* custom clipboard types are not available in every browser */ }
            }
            updateImageEditControls();
            return true;
        }

        function removeSelectedImage({ message = 'Image deleted from the Kobo page.' } = {}) {
            const img = selectedEditableImage;
            const unit = editableImageUnit(img);
            if (!img || !unit || !previewEl?.contains(unit)) return false;
            const selection = window.getSelection();
            const range = document.createRange();
            range.setStartBefore(unit);
            range.collapse(true);
            unit.remove();
            selectedEditableImage = null;
            savedEditRange = range.cloneRange();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
            previewEl.focus({ preventScroll: true });
            updateImageEditControls();
            finishImageEdit(message);
            return true;
        }

        function copySelectedImage() {
            if (!selectedEditableImage || !putImageOnClipboard(null, selectedEditableImage)) return false;
            try {
                document.execCommand('copy');
            } catch (_) { /* the internal clipboard still works */ }
            statusEl.textContent = 'Image copied. Select its destination, then paste.';
            updateImageEditControls({ reveal: true });
            return true;
        }

        function cutSelectedImage() {
            if (!selectedEditableImage || !putImageOnClipboard(null, selectedEditableImage)) return false;
            try {
                document.execCommand('copy');
            } catch (_) { /* the internal clipboard still works */ }
            return removeSelectedImage({
                message: 'Image cut. Select its new destination, then paste.'
            });
        }

        function imageInsertionRange() {
            const selection = window.getSelection();
            if (selection?.rangeCount) {
                const active = selection.getRangeAt(0);
                if (rangeLivesInPreview(active)) return active.cloneRange();
            }
            if (savedEditRange && rangeLivesInPreview(savedEditRange)) {
                return savedEditRange.cloneRange();
            }
            if (!previewEl) return null;
            const range = document.createRange();
            range.selectNodeContents(previewEl);
            range.collapse(false);
            return range;
        }

        function imageInsertionRangeFromPoint(clientX, clientY) {
            let range = null;
            if (typeof document.caretRangeFromPoint === 'function') {
                range = document.caretRangeFromPoint(clientX, clientY);
            } else if (typeof document.caretPositionFromPoint === 'function') {
                const position = document.caretPositionFromPoint(clientX, clientY);
                if (position) {
                    range = document.createRange();
                    range.setStart(position.offsetNode, position.offset);
                    range.collapse(true);
                }
            }
            return rangeLivesInPreview(range) ? range.cloneRange() : imageInsertionRange();
        }

        function insertOptimizedImageHtml(html, targetRange = imageInsertionRange()) {
            if (!canEditImagesNow() || !html || !targetRange || !rangeLivesInPreview(targetRange)) {
                return 0;
            }
            const parsed = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
            const sourceImages = Array.from(parsed.querySelectorAll('#root img'));
            if (!sourceImages.length) return 0;

            const anchorNode = targetRange.startContainer.nodeType === Node.ELEMENT_NODE
                ? targetRange.startContainer
                : targetRange.startContainer.parentElement;
            const block = anchorNode?.closest?.(
                'p,h1,h2,h3,h4,blockquote,figure.kf-document-image,.kf-pdf-block,table'
            );
            const insertAfterBlock = block && block !== previewEl && previewEl.contains(block);
            let insertionParent = insertAfterBlock ? block.parentNode : null;
            let insertionReference = insertAfterBlock ? block.nextSibling : null;
            let lastImage = null;

            if (!insertAfterBlock) targetRange.deleteContents();
            sourceImages.forEach((sourceImage) => {
                const img = document.importNode(sourceImage, true);
                const inCellOrList = !!anchorNode?.closest?.('th,td,li');
                let node = img;
                if (!inCellOrList) {
                    const figure = document.createElement('figure');
                    figure.className = 'kf-document-image';
                    figure.appendChild(img);
                    node = figure;
                }
                if (insertAfterBlock) {
                    insertionParent.insertBefore(node, insertionReference);
                } else {
                    targetRange.insertNode(node);
                    targetRange.setStartAfter(node);
                    targetRange.collapse(true);
                }
                lastImage = img;
            });

            configureEditableImages();
            if (lastImage) {
                selectEditableImage(lastImage, { reveal: true });
            }
            finishImageEdit(
                `${sourceImages.length} image${sourceImages.length === 1 ? '' : 's'} added and sized for this Kobo.`
            );
            return sourceImages.length;
        }

        function blobAsDataUrl(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(reader.error || new Error('Could not read the pasted image.'));
                reader.readAsDataURL(blob);
            });
        }

        function imageMarkupFromDataUrls(sources) {
            const doc = document.implementation.createHTMLDocument('');
            const root = doc.createElement('div');
            sources.forEach((source, index) => {
                if (!/^data:image\//i.test(source || '')) return;
                const img = doc.createElement('img');
                img.src = source;
                img.alt = `Pasted image${sources.length > 1 ? ` ${index + 1}` : ''}`;
                root.appendChild(img);
            });
            return root.innerHTML;
        }

        function usablePastedImageHtml(html) {
            if (!html) return '';
            const parsed = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
            const root = parsed.getElementById('root');
            if (!root) return '';
            const accepted = document.createElement('div');
            root.querySelectorAll('img').forEach((source) => {
                const src = source.getAttribute('src') || '';
                if (!/^data:image\//i.test(src)) return;
                const img = document.createElement('img');
                img.src = src;
                img.alt = source.getAttribute('alt') || 'Pasted image';
                const imageId = source.getAttribute('data-kf-image-id');
                if (imageId) img.setAttribute('data-kf-image-id', imageId);
                const width = normalizedImageWidth(source);
                img.setAttribute('data-kf-width', String(width));
                img.setAttribute(
                    'data-kf-width-mode',
                    source.getAttribute('data-kf-width-mode')
                    || (source.hasAttribute('data-kf-width') || !!source.style.width ? 'user' : 'auto')
                );
                img.setAttribute('data-kf-layout', normalizedImageLayout(source));
                img.setAttribute(
                    'data-kf-layout-mode',
                    source.getAttribute('data-kf-layout-mode')
                    || (source.hasAttribute('data-kf-layout') ? 'user' : 'auto')
                );
                img.style.width = `${width}%`;
                accepted.appendChild(img);
            });
            return accepted.innerHTML;
        }

        async function optimizeAndInsertPastedImages(markup, targetRange = imageInsertionRange()) {
            if (!markup || !currentOutput) return 0;
            const optimized = await optimizeDocumentImages(markup, {
                imageSources: currentOutput.imageSources || {},
                imageVariants: currentOutput.imageVariants || {},
                target: documentImageTarget()
            });
            currentOutput.imageSources = optimized.imageSources;
            currentOutput.imageVariants = optimized.imageVariants;
            return insertOptimizedImageHtml(optimized.html, targetRange);
        }

        async function handleImagePaste(event) {
            if (!canEditImagesNow() || !event.clipboardData) return;
            const targetRange = imageInsertionRange();
            const imageFiles = Array.from(event.clipboardData.items || [])
                .filter((item) => item.kind === 'file' && /^image\//i.test(item.type || ''))
                .map((item) => item.getAsFile())
                .filter(Boolean);
            const custom = event.clipboardData.getData('application/x-koboforge-image');
            const html = custom
                || usablePastedImageHtml(event.clipboardData.getData('text/html'));
            if (!imageFiles.length && !html) return;
            event.preventDefault();
            try {
                const markup = imageFiles.length
                    ? imageMarkupFromDataUrls(await Promise.all(imageFiles.map(blobAsDataUrl)))
                    : html;
                await optimizeAndInsertPastedImages(markup, targetRange);
            } catch (error) {
                console.error('[KoboForge] Image paste', error);
                statusEl.textContent = error.message || 'Could not paste that image.';
            }
        }

        async function pasteImageFromToolbar() {
            if (!imageClipboardHtml) return;
            const targetRange = imageInsertionRange();
            try {
                await optimizeAndInsertPastedImages(imageClipboardHtml, targetRange);
            } catch (error) {
                console.error('[KoboForge] Image paste', error);
                statusEl.textContent = error.message || 'Could not paste that image.';
            }
        }

        function moveEditableImageToPoint(img, clientX, clientY) {
            if (!canEditImagesNow() || !img || !previewEl?.contains(img)) return false;
            const unit = editableImageUnit(img);
            const targetRange = imageInsertionRangeFromPoint(clientX, clientY);
            if (!unit || !targetRange || !rangeLivesInPreview(targetRange)) return false;
            const anchor = targetRange.startContainer.nodeType === Node.ELEMENT_NODE
                ? targetRange.startContainer
                : targetRange.startContainer.parentElement;
            if (!anchor || unit.contains(anchor)) return false;

            const targetCellOrList = anchor.closest?.('th,td,li');
            if (targetCellOrList && previewEl.contains(targetCellOrList)) {
                if (unit !== img) {
                    unit.removeChild(img);
                    unit.remove();
                }
                targetRange.deleteContents();
                targetRange.insertNode(img);
            } else {
                const targetBlock = anchor.closest?.(
                    'p,h1,h2,h3,h4,blockquote,figure.kf-document-image,.kf-pdf-block,table,.kf-note-space'
                );
                if (targetBlock && previewEl.contains(targetBlock) && targetBlock !== unit) {
                    const rect = targetBlock.getBoundingClientRect();
                    const before = clientY < rect.top + (rect.height / 2);
                    targetBlock.parentNode.insertBefore(unit, before ? targetBlock : targetBlock.nextSibling);
                } else {
                    previewEl.appendChild(unit);
                }
            }

            applyImageLayoutPresentation(img);
            selectEditableImage(img, { focus: true, reveal: true });
            finishImageEdit('Image moved to its new position.');
            return true;
        }

        async function handleImageDrop(event) {
            if (!canEditImagesNow()) return;
            const imageFiles = Array.from(event.dataTransfer?.files || [])
                .filter((file) => /^image\//i.test(file.type || ''));
            if (!imageFiles.length) return;
            event.preventDefault();
            previewEl.classList.remove('kf-image-drop-active');
            const targetRange = imageInsertionRangeFromPoint(event.clientX, event.clientY);
            try {
                const markup = imageMarkupFromDataUrls(
                    await Promise.all(imageFiles.map(blobAsDataUrl))
                );
                await optimizeAndInsertPastedImages(markup, targetRange);
            } catch (error) {
                console.error('[KoboForge] Image drop', error);
                statusEl.textContent = error.message || 'Could not add that image.';
            }
        }

        function dataTransferHasImage(dataTransfer) {
            const files = Array.from(dataTransfer?.files || []);
            if (files.some((file) => /^image\//i.test(file.type || ''))) return true;
            const items = Array.from(dataTransfer?.items || []);
            if (items.some((item) => item.kind === 'file' && /^image\//i.test(item.type || ''))) {
                return true;
            }
            return !items.length && Array.from(dataTransfer?.types || []).includes('Files');
        }

        function afterFormat() {
            beginEditablePageLock();
            markEdited();
            updateToolbarActiveState();
            clearTimeout(commitTimer);
            commitTimer = setTimeout(() => {
                refreshDiffLive();
            }, 80);
        }

        function resetInheritedSelectionTypography() {
            const selection = window.getSelection();
            if (!selection?.rangeCount || !previewEl) return;
            const range = selection.getRangeAt(0);
            if (!rangeLivesInPreview(range) || range.collapsed) return;
            const walker = document.createTreeWalker(
                previewEl,
                NodeFilter.SHOW_TEXT
            );
            const slices = [];
            let node = walker.nextNode();
            while (node) {
                let intersects = false;
                try {
                    intersects = range.intersectsNode(node);
                } catch (_) { /* ignore */ }
                if (intersects) {
                    const start = node === range.startContainer ? range.startOffset : 0;
                    const end = node === range.endContainer
                        ? range.endOffset
                        : (node.nodeValue || '').length;
                    if (end > start) slices.push({ node, start, end, selected: null });
                }
                node = walker.nextNode();
            }

            // Work backwards so splitting a boundary text node cannot invalidate
            // offsets saved for any later slice.
            slices.slice().reverse().forEach((slice) => {
                let selected = slice.node;
                const length = (selected.nodeValue || '').length;
                if (slice.end < length) selected.splitText(slice.end);
                if (slice.start > 0) selected = selected.splitText(slice.start);
                slice.selected = selected;
                const style = getComputedStyle(selected.parentElement);
                const weight = String(style.fontWeight || '').toLowerCase();
                const numericWeight = Number.parseInt(weight, 10);
                const bold = (
                    weight === 'bold'
                    || weight === 'bolder'
                    || (Number.isFinite(numericWeight) && numericWeight >= 600)
                );
                const italic = /^(italic|oblique)(?:\s|$)/i.test(
                    String(style.fontStyle || '')
                );
                if (!bold && !italic) return;
                const reset = document.createElement('span');
                if (bold) reset.classList.add('kf-not-bold');
                if (italic) reset.classList.add('kf-not-italic');
                selected.parentNode?.insertBefore(reset, selected);
                reset.appendChild(selected);
            });

            const first = slices[0]?.selected;
            const last = slices[slices.length - 1]?.selected;
            if (first && last) {
                const restored = document.createRange();
                restored.setStart(first, 0);
                restored.setEnd(last, (last.nodeValue || '').length);
                selection.removeAllRanges();
                selection.addRange(restored);
            }
        }

        /**
         * Custom list toggle — multi-column contenteditable often ignores
         * execCommand(insertOrderedList/insertUnorderedList).
         */
        function toggleList(ordered) {
            if (!canFormatNow()) return;
            previewEl.focus();
            const tag = ordered ? 'ol' : 'ul';
            const format = ordered ? 'decimal' : 'bullet';
            let blocks = selectedEditableBlocks().filter((block) => {
                const name = block.tagName?.toLowerCase();
                return name !== 'table' && name !== 'th' && name !== 'td'
                    && !block.classList?.contains('kf-page-break')
                    && !block.classList?.contains('kf-note-space');
            });
            if (!blocks.length) {
                const selection = window.getSelection();
                let node = selection?.anchorNode;
                if (node?.nodeType === 3) node = node.parentElement;
                const block = node?.closest?.('p, h1, h2, h3, h4, li, blockquote, div');
                if (block && previewEl.contains(block) && block !== previewEl) {
                    blocks = [block];
                }
            }
            if (!blocks.length) {
                try {
                    document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList', false, null);
                } catch (_) { /* ignore */ }
                afterFormat();
                return;
            }

            const listItems = blocks.map((block) => (
                block.tagName?.toLowerCase() === 'li' ? block : block.closest?.('li')
            )).filter(Boolean);
            const allInMatchingList = listItems.length === blocks.length
                && listItems.every((li) => li.closest(tag));

            if (allInMatchingList) {
                listItems.forEach((li) => {
                    const paragraph = document.createElement('p');
                    paragraph.innerHTML = li.innerHTML;
                    // Drop nested lists from unwrap target content? keep them.
                    const list = li.parentElement;
                    li.replaceWith(paragraph);
                    if (list && !list.querySelector('li')) list.remove();
                });
                afterFormat();
                return;
            }

            // Unwrap foreign lists first so we re-wrap cleanly.
            blocks = blocks.map((block) => {
                if (block.tagName?.toLowerCase() !== 'li') return block;
                const paragraph = document.createElement('p');
                paragraph.innerHTML = block.innerHTML;
                const list = block.parentElement;
                block.replaceWith(paragraph);
                if (list && !list.querySelector('li')) list.remove();
                return paragraph;
            });

            const list = document.createElement(tag);
            list.className = 'kf-list kf-user-list';
            list.setAttribute('data-kf-list-format', format);
            list.style.listStyleType = ordered ? 'decimal' : 'disc';
            const anchor = blocks[0];
            anchor.before(list);
            blocks.forEach((block) => {
                const li = document.createElement('li');
                li.setAttribute('data-kf-list-format', format);
                li.setAttribute('data-kf-list-level', '0');
                if (block.tagName?.toLowerCase() === 'li') {
                    li.innerHTML = block.innerHTML;
                } else {
                    li.innerHTML = block.innerHTML;
                }
                list.appendChild(li);
                block.remove();
            });
            afterFormat();
        }

        /** Inline style: bold / italic / underline / strike / lists (Kobo-safe HTML). */
        function runFormatCommand(cmd) {
            if (!canFormatNow() || !cmd) return;
            previewEl.focus();
            if (cmd === 'insertOrderedList') {
                toggleList(true);
                return;
            }
            if (cmd === 'insertUnorderedList') {
                toggleList(false);
                return;
            }
            try {
                if (cmd === 'removeFormat') {
                    document.execCommand('removeFormat', false, null);
                    // removeFormat strips inline elements but cannot neutralize
                    // typography inherited from a block. Reset each selected text
                    // slice independently; aggregate command state conflates mixed
                    // bold/normal selections with entirely normal selections.
                    resetInheritedSelectionTypography();
                } else {
                    document.execCommand(cmd, false, null);
                }
            } catch (_) { /* ignore */ }
            afterFormat();
        }

        function transferBlockChrome(from, to) {
            if (!from || !to) return;
            [
                'kf-align-left',
                'kf-align-center',
                'kf-align-right',
                'kf-align-justify',
                'kf-pdf-block',
                'preserve-structure',
                'kf-user-size-75',
                'kf-user-size-88',
                'kf-user-size-100',
                'kf-user-size-112',
                'kf-user-size-125',
                'kf-user-size-150',
                'kf-user-size-175'
            ].forEach((name) => {
                if (from.classList?.contains(name)) to.classList.add(name);
            });
            const align = from.getAttribute?.('data-kf-align');
            if (align) {
                to.setAttribute('data-kf-align', align);
                to.style.setProperty('text-align', align, 'important');
            } else if (from.style?.textAlign) {
                to.style.textAlign = from.style.textAlign;
            }
            const fontSize = from.getAttribute?.('data-kf-font-size');
            if (fontSize) to.setAttribute('data-kf-font-size', fontSize);
        }

        function placeCaretIn(element) {
            if (!element) return;
            const selection = window.getSelection();
            if (!selection) return;
            const range = document.createRange();
            range.selectNodeContents(element);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        function resolveFormatBlocks() {
            let blocks = selectedEditableBlocks().filter((block) => {
                const name = block.tagName?.toLowerCase();
                return name !== 'table' && name !== 'th' && name !== 'td'
                    && !block.classList?.contains('kf-page-break')
                    && !block.classList?.contains('kf-note-space');
            });
            if (!blocks.length) {
                const selection = window.getSelection();
                let node = selection?.anchorNode;
                if (node?.nodeType === 3) node = node.parentElement;
                const block = node?.closest?.('p, h1, h2, h3, h4, li, blockquote, div');
                if (block && previewEl.contains(block) && block !== previewEl) {
                    blocks = [block];
                }
            }
            return blocks;
        }

        /** Promote selection / current block to p|h1|h2|h3|blockquote (blockquote toggles off). */
        function formatBlockTag(tag) {
            if (!canFormatNow()) return;
            const allowed = { p: true, h1: true, h2: true, h3: true, blockquote: true };
            if (!allowed[tag]) return;
            previewEl.focus();

            const blocks = resolveFormatBlocks();
            if (!blocks.length) {
                try {
                    document.execCommand('formatBlock', false, tag === 'blockquote' ? 'blockquote' : tag);
                } catch (_) { /* ignore */ }
                afterFormat();
                return;
            }

            // Block quote is a toggle: second click restores a normal paragraph.
            if (tag === 'blockquote') {
                const quoteRoots = blocks.map((block) => (
                    block.tagName?.toLowerCase() === 'blockquote'
                        ? block
                        : block.closest?.('blockquote')
                ));
                const allInQuote = quoteRoots.length
                    && quoteRoots.every(Boolean)
                    && quoteRoots.every((quote) => previewEl.contains(quote));
                if (allInQuote) {
                    let last = null;
                    quoteRoots.forEach((quote) => {
                        const paragraph = document.createElement('p');
                        paragraph.innerHTML = quote.innerHTML;
                        transferBlockChrome(quote, paragraph);
                        quote.replaceWith(paragraph);
                        last = paragraph;
                    });
                    placeCaretIn(last);
                    afterFormat();
                    return;
                }
            }

            let last = null;
            blocks.forEach((block) => {
                let target = block;
                // If caret is inside a quote but not on the quote element itself,
                // retarget the whole quote when converting to another block type.
                if (
                    tag !== 'blockquote'
                    && target.tagName?.toLowerCase() !== 'blockquote'
                ) {
                    const parentQuote = target.closest?.('blockquote');
                    if (parentQuote && previewEl.contains(parentQuote)) {
                        target = parentQuote;
                    }
                }
                const currentTag = target.tagName?.toLowerCase();
                if (currentTag === tag) {
                    last = target;
                    return;
                }
                if (currentTag === 'li' && tag !== 'p') {
                    // Convert list item into a free block (quote/heading) outside the list.
                    const next = document.createElement(tag);
                    next.innerHTML = target.innerHTML;
                    transferBlockChrome(target, next);
                    const list = target.parentElement;
                    target.replaceWith(next);
                    if (list && !list.querySelector('li')) list.remove();
                    last = next;
                    return;
                }
                const next = document.createElement(tag);
                next.innerHTML = target.innerHTML;
                transferBlockChrome(target, next);
                if (tag === 'p' && target.classList?.contains('preserve-structure')) {
                    next.classList.add('preserve-structure');
                }
                target.replaceWith(next);
                last = next;
            });
            placeCaretIn(last);
            afterFormat();
        }

        const EDITABLE_BLOCK_SELECTOR = [
            'p', 'h1', 'h2', 'h3', 'h4', 'li', 'blockquote',
            'table', 'th', 'td', '.kf-pdf-block'
        ].join(',');
        const USER_SIZE_CLASSES = [
            'kf-user-size-75',
            'kf-user-size-88',
            'kf-user-size-100',
            'kf-user-size-112',
            'kf-user-size-125',
            'kf-user-size-150',
            'kf-user-size-175'
        ];

        function selectedEditableBlocks() {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount || !previewEl) return [];
            const range = selection.getRangeAt(0);
            let anchor = selection.anchorNode;
            if (anchor?.nodeType === 3) anchor = anchor.parentElement;
            const closest = anchor?.closest?.(EDITABLE_BLOCK_SELECTOR);
            if (range.collapsed) {
                return closest && previewEl.contains(closest) ? [closest] : [];
            }
            const candidates = Array.from(previewEl.querySelectorAll(EDITABLE_BLOCK_SELECTOR))
                .filter((node) => {
                    try {
                        return range.intersectsNode(node);
                    } catch (_) {
                        return false;
                    }
                });
            // Keep only the innermost selected blocks. This prevents a range in a
            // table from styling both the table and every selected cell.
            const innermost = candidates.filter((node) => (
                !candidates.some((other) => other !== node && node.contains(other))
            ));
            return innermost.length
                ? innermost
                : (closest && previewEl.contains(closest) ? [closest] : []);
        }

        function applyHorizontalAlignment(alignment) {
            if (!canFormatNow() || !['left', 'center', 'right', 'justify'].includes(alignment)) return;
            let blocks = selectedEditableBlocks();
            if (!blocks.length) {
                blocks = resolveFormatBlocks();
            }
            if (!blocks.length) return;
            blocks.forEach((block) => {
                // Prefer the blockquote/list-item container so nested inlines
                // do not keep a forced left alignment from PDF/DOCX classes.
                let target = block;
                const quote = block.closest?.('blockquote');
                if (quote && previewEl.contains(quote) && block !== quote) {
                    target = quote;
                }
                target.classList.remove(
                    'kf-align-left',
                    'kf-align-center',
                    'kf-align-right',
                    'kf-align-justify'
                );
                target.classList.add(`kf-align-${alignment}`);
                target.setAttribute('data-kf-align', alignment);
                // Inline + important beats preserve-structure / kf-pdf-block left rules
                // and multi-column preview quirks that drop pure class-based justify.
                target.style.setProperty('text-align', alignment, 'important');
                if (alignment === 'justify') {
                    target.style.setProperty('text-justify', 'inter-word', 'important');
                    if (!/^(TH|TD)$/.test(target.tagName)) {
                        target.style.setProperty('width', '100%', 'important');
                        target.style.setProperty('max-width', '100%', 'important');
                        target.style.setProperty('display', 'block', 'important');
                        target.style.setProperty('box-sizing', 'border-box', 'important');
                    }
                    // Inner PDF line wrappers must stay inline so the parent can justify.
                    target.querySelectorAll?.('.kf-pdf-line').forEach((node) => {
                        node.style.removeProperty('display');
                        node.style.removeProperty('max-width');
                    });
                    target.querySelectorAll?.('[style*="text-align"]').forEach((node) => {
                        if (node === target) return;
                        if (node.style?.textAlign && node.style.textAlign !== 'justify') {
                            node.style.removeProperty('text-align');
                        }
                    });
                } else {
                    target.style.removeProperty('text-justify');
                    target.style.removeProperty('width');
                    target.style.removeProperty('max-width');
                    if (!/^(TH|TD)$/.test(target.tagName)) {
                        target.style.removeProperty('display');
                    }
                    target.style.removeProperty('box-sizing');
                }
            });
            afterFormat();
        }

        function selectedTableCells() {
            const selection = window.getSelection();
            if (!selection?.rangeCount || !previewEl) return [];
            const range = selection.getRangeAt(0);
            if (!rangeLivesInPreview(range)) return [];
            let anchor = selection.anchorNode;
            if (anchor?.nodeType === Node.TEXT_NODE) anchor = anchor.parentElement;
            const anchorCell = anchor?.closest?.('th,td');
            if (range.collapsed) {
                return anchorCell && previewEl.contains(anchorCell) ? [anchorCell] : [];
            }
            const cells = Array.from(previewEl.querySelectorAll('th,td')).filter((cell) => {
                try {
                    return range.intersectsNode(cell);
                } catch (_) {
                    return false;
                }
            });
            return cells.length
                ? cells
                : (anchorCell && previewEl.contains(anchorCell) ? [anchorCell] : []);
        }

        function applyVerticalPlacement(position) {
            if (!canFormatNow() || !['top', 'middle', 'bottom'].includes(position)) return;
            const cells = selectedTableCells();
            if (!cells.length) return;
            cells.forEach((cell) => {
                cell.classList.remove('kf-user-vpos-top', 'kf-user-vpos-middle', 'kf-user-vpos-bottom');
                cell.classList.add(`kf-user-vpos-${position}`);
                cell.style.removeProperty('vertical-align');
                cell.setAttribute('data-kf-vpos', position);
            });
            afterFormat();
        }

        function changeSelectedFontSize(step) {
            if (!canFormatNow()) return;
            const delta = Number(step) || 0;
            selectedEditableBlocks().forEach((block) => {
                let currentIndex = USER_SIZE_CLASSES.findIndex((name) => block.classList.contains(name));
                if (currentIndex < 0) currentIndex = 2;
                USER_SIZE_CLASSES.forEach((name) => block.classList.remove(name));
                if (delta !== 0) {
                    const nextIndex = Math.max(
                        0,
                        Math.min(USER_SIZE_CLASSES.length - 1, currentIndex + delta)
                    );
                    block.classList.add(USER_SIZE_CLASSES[nextIndex]);
                    block.setAttribute('data-kf-font-size', USER_SIZE_CLASSES[nextIndex].replace('kf-user-size-', ''));
                } else {
                    block.removeAttribute('data-kf-font-size');
                }
            });
            afterFormat();
        }

        function placeCaretInside(element, atEnd = false) {
            if (!element) return;
            const selection = window.getSelection();
            if (!selection) return;
            const range = document.createRange();
            range.selectNodeContents(element);
            range.collapse(!atEnd);
            selection.removeAllRanges();
            selection.addRange(range);
            element.closest?.('#deviceBookContent')?.focus();
        }

        function updateTablePickerSelection(rows = 1, columns = 1) {
            const selectedRows = Math.max(1, Math.min(5, Math.round(Number(rows) || 1)));
            const selectedColumns = Math.max(1, Math.min(5, Math.round(Number(columns) || 1)));
            tablePickerGrid?.querySelectorAll('[data-table-row]').forEach((cell) => {
                const selected = Number(cell.dataset.tableRow) <= selectedRows
                    && Number(cell.dataset.tableColumn) <= selectedColumns;
                cell.classList.toggle('is-selected', selected);
                cell.setAttribute('aria-selected', String(selected));
            });
            if (tablePickerLabel) {
                tablePickerLabel.textContent = `${selectedRows} × ${selectedColumns} table`;
            }
        }

        function positionTablePicker() {
            if (!tablePicker || tablePicker.classList.contains('hidden') || !insertTableBtn) return;
            const buttonRect = insertTableBtn.getBoundingClientRect();
            const pickerRect = tablePicker.getBoundingClientRect();
            const gutter = 8;
            const left = Math.max(
                gutter,
                Math.min(
                    window.innerWidth - pickerRect.width - gutter,
                    buttonRect.left + (buttonRect.width / 2) - (pickerRect.width / 2)
                )
            );
            const below = buttonRect.bottom + 6;
            const top = below + pickerRect.height <= window.innerHeight - gutter
                ? below
                : Math.max(gutter, buttonRect.top - pickerRect.height - 6);
            tablePicker.style.left = `${Math.round(left)}px`;
            tablePicker.style.top = `${Math.round(top)}px`;
        }

        function closeTablePicker({ returnFocus = false } = {}) {
            if (!tablePicker) return;
            tablePicker.classList.add('hidden');
            insertTableBtn?.setAttribute('aria-expanded', 'false');
            if (returnFocus) insertTableBtn?.focus({ preventScroll: true });
        }

        function openTablePicker() {
            if (!canFormatNow() || !tablePicker) return;
            tableInsertionRange = imageInsertionRange();
            updateTablePickerSelection(1, 1);
            tablePicker.classList.remove('hidden');
            insertTableBtn?.setAttribute('aria-expanded', 'true');
            positionTablePicker();
            tablePickerGrid?.querySelector('[data-table-row="1"][data-table-column="1"]')
                ?.focus({ preventScroll: true });
        }

        function toggleTablePicker() {
            if (!tablePicker || tablePicker.classList.contains('hidden')) openTablePicker();
            else closeTablePicker({ returnFocus: true });
        }

        function buildTablePicker() {
            if (!tablePickerGrid) return;
            tablePickerGrid.innerHTML = '';
            for (let row = 1; row <= 5; row += 1) {
                for (let column = 1; column <= 5; column += 1) {
                    const cell = document.createElement('button');
                    cell.type = 'button';
                    cell.className = 'table-picker-cell';
                    cell.dataset.tableRow = String(row);
                    cell.dataset.tableColumn = String(column);
                    cell.setAttribute('role', 'gridcell');
                    cell.setAttribute('aria-label', `${row} rows by ${column} columns`);
                    cell.setAttribute('aria-selected', 'false');
                    cell.addEventListener('pointerenter', () => {
                        updateTablePickerSelection(row, column);
                    });
                    cell.addEventListener('focus', () => {
                        updateTablePickerSelection(row, column);
                    });
                    cell.addEventListener('click', () => {
                        const targetRange = tableInsertionRange?.cloneRange?.() || null;
                        closeTablePicker();
                        insertEditableTable(row, column, targetRange);
                    });
                    cell.addEventListener('keydown', (event) => {
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            closeTablePicker({ returnFocus: true });
                            return;
                        }
                        const movement = {
                            ArrowLeft: [0, -1],
                            ArrowRight: [0, 1],
                            ArrowUp: [-1, 0],
                            ArrowDown: [1, 0]
                        }[event.key];
                        if (!movement) return;
                        event.preventDefault();
                        const nextRow = Math.max(1, Math.min(5, row + movement[0]));
                        const nextColumn = Math.max(1, Math.min(5, column + movement[1]));
                        tablePickerGrid.querySelector(
                            `[data-table-row="${nextRow}"][data-table-column="${nextColumn}"]`
                        )?.focus();
                    });
                    tablePickerGrid.appendChild(cell);
                }
            }
            updateTablePickerSelection(1, 1);
        }

        function insertEditableTable(
            rows = 2,
            columns = 2,
            targetRange = tableInsertionRange || imageInsertionRange()
        ) {
            if (!canFormatNow()) return;
            const rowCount = Math.max(1, Math.min(5, Math.round(Number(rows) || 1)));
            const columnCount = Math.max(1, Math.min(5, Math.round(Number(columns) || 1)));
            if (!targetRange || !rangeLivesInPreview(targetRange)) return;
            const selection = window.getSelection();
            if (!selection) return;
            const table = document.createElement('table');
            table.className = 'kobo-table kf-user-table';
            const tbody = document.createElement('tbody');
            for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
                const row = document.createElement('tr');
                for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
                    const cell = document.createElement('td');
                    cell.appendChild(document.createElement('br'));
                    row.appendChild(cell);
                }
                tbody.appendChild(row);
            }
            table.appendChild(tbody);

            let anchor = targetRange.startContainer;
            if (anchor?.nodeType === 3) anchor = anchor.parentElement;
            const block = anchor?.closest?.('p,h1,h2,h3,h4,blockquote,li,table');
            if (block && block !== previewEl && previewEl.contains(block)) {
                block.insertAdjacentElement('afterend', table);
            } else {
                targetRange.deleteContents();
                targetRange.insertNode(table);
            }
            tableInsertionRange = null;
            placeCaretInside(table.querySelector('td'));
            afterFormat();
            scheduleDevicePagination();
        }

        function addTableRow(table) {
            const tbody = table?.tBodies?.[0] || table?.appendChild(document.createElement('tbody'));
            const columnCount = Math.max(
                1,
                table?.rows?.[0]?.cells?.length || 2
            );
            const row = document.createElement('tr');
            for (let index = 0; index < columnCount; index += 1) {
                const cell = document.createElement('td');
                cell.appendChild(document.createElement('br'));
                row.appendChild(cell);
            }
            tbody.appendChild(row);
            return row;
        }

        function handleEditorTab(event) {
            if (event.key !== 'Tab' || !canFormatNow()) return;
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return;
            let anchor = selection.anchorNode;
            if (anchor?.nodeType === 3) anchor = anchor.parentElement;
            const cell = anchor?.closest?.('th,td');
            if (cell && previewEl.contains(cell)) {
                event.preventDefault();
                const table = cell.closest('table');
                let cells = Array.from(table.querySelectorAll('th,td'));
                const currentIndex = cells.indexOf(cell);
                let targetIndex = currentIndex + (event.shiftKey ? -1 : 1);
                if (!event.shiftKey && targetIndex >= cells.length) {
                    addTableRow(table);
                    cells = Array.from(table.querySelectorAll('th,td'));
                    targetIndex = cells.length - (table.rows[0]?.cells?.length || 2);
                    afterFormat();
                    scheduleDevicePagination();
                }
                if (targetIndex >= 0 && targetIndex < cells.length) {
                    placeCaretInside(cells[targetIndex]);
                }
                return;
            }

            const listItem = anchor?.closest?.('li');
            if (listItem && previewEl.contains(listItem)) {
                event.preventDefault();
                try {
                    document.execCommand(event.shiftKey ? 'outdent' : 'indent', false, null);
                } catch (_) { /* ignore */ }
                afterFormat();
                return;
            }

            event.preventDefault();
            if (event.shiftKey) {
                try {
                    document.execCommand('outdent', false, null);
                } catch (_) { /* ignore */ }
                afterFormat();
                return;
            }
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const tab = document.createElement('span');
            tab.className = 'kf-tab';
            tab.setAttribute('contenteditable', 'false');
            tab.setAttribute('aria-label', 'Tab');
            tab.innerHTML = '&#160;';
            range.insertNode(tab);
            range.setStartAfter(tab);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            afterFormat();
        }

        function updateToolbarActiveState() {
            if (!editToolbar || !canFormatNow()) {
                editToolbar?.querySelectorAll('.tb-btn[data-cmd]').forEach((b) => b.classList.remove('is-active'));
                editToolbar?.querySelectorAll('.tb-btn[data-vpos]').forEach((b) => {
                    b.classList.remove('is-active');
                    b.disabled = true;
                });
                return;
            }
            const cmdMap = {
                bold: 'bold',
                italic: 'italic',
                underline: 'underline',
                strikeThrough: 'strikeThrough',
                insertUnorderedList: 'insertUnorderedList',
                insertOrderedList: 'insertOrderedList'
            };
            editToolbar.querySelectorAll('.tb-btn[data-cmd]').forEach((btn) => {
                const cmd = btn.dataset.cmd;
                if (!cmd || cmd === 'removeFormat') {
                    btn.classList.remove('is-active');
                    return;
                }
                let on = false;
                try {
                    on = document.queryCommandState(cmdMap[cmd] || cmd);
                } catch (_) { /* ignore */ }
                btn.classList.toggle('is-active', !!on);
            });
            const formatBlocks = resolveFormatBlocks();
            editToolbar.querySelectorAll('.block-fmt-btn[data-block]').forEach((btn) => {
                const want = btn.dataset.block;
                const on = formatBlocks.length > 0 && formatBlocks.every((block) => {
                    if (want === 'blockquote') {
                        return block.tagName?.toLowerCase() === 'blockquote'
                            || !!block.closest?.('blockquote');
                    }
                    return block.tagName?.toLowerCase() === want;
                });
                btn.classList.toggle('is-active', on);
            });
            editToolbar.querySelectorAll('.tb-btn[data-align]').forEach((btn) => {
                const want = btn.dataset.align;
                const on = formatBlocks.length > 0 && formatBlocks.every((block) => {
                    const target = block.closest?.('blockquote') && block.tagName?.toLowerCase() !== 'blockquote'
                        ? block.closest('blockquote')
                        : block;
                    return target.getAttribute('data-kf-align') === want
                        || target.classList.contains(`kf-align-${want}`)
                        || (want === 'justify'
                            && (target.style.textAlign === 'justify'
                                || (!target.getAttribute('data-kf-align')
                                    && target.tagName?.toLowerCase() === 'p'
                                    && !target.classList.contains('preserve-structure')
                                    && !target.classList.contains('kf-pdf-block')
                                    && !target.classList.contains('kf-align-left')
                                    && !target.classList.contains('kf-align-center')
                                    && !target.classList.contains('kf-align-right'))));
                });
                btn.classList.toggle('is-active', on);
            });
            const cells = selectedTableCells();
            editToolbar.querySelectorAll('.tb-btn[data-vpos]').forEach((btn) => {
                btn.disabled = !cells.length;
                btn.classList.toggle(
                    'is-active',
                    !!cells.length && cells.every((cell) => (
                        cell.getAttribute('data-kf-vpos') === btn.dataset.vpos
                        || cell.classList.contains(`kf-user-vpos-${btn.dataset.vpos}`)
                    ))
                );
            });
        }

        editToolbar?.querySelectorAll('.tb-btn, .block-fmt-btn').forEach((btn) => {
            btn.addEventListener('mousedown', (e) => {
                // Prevent blur losing selection before click (critical on mobile)
                e.preventDefault();
            });
            btn.addEventListener('click', () => {
                if (btn.dataset.cmd) runFormatCommand(btn.dataset.cmd);
                else if (btn.dataset.block) formatBlockTag(btn.dataset.block);
                else if (btn.dataset.align) applyHorizontalAlignment(btn.dataset.align);
                else if (btn.dataset.vpos) applyVerticalPlacement(btn.dataset.vpos);
                else if (btn.dataset.fontStep !== undefined) changeSelectedFontSize(btn.dataset.fontStep);
                else if (btn.dataset.imageLayout) setSelectedImageLayout(btn.dataset.imageLayout);
                else if (btn === insertTableBtn) toggleTablePicker();
            });
        });

        buildTablePicker();
        document.addEventListener('pointerdown', (event) => {
            if (
                tablePicker?.classList.contains('hidden')
                || tablePicker?.contains(event.target)
                || insertTableBtn?.contains(event.target)
            ) return;
            closeTablePicker();
        });
        document.addEventListener('scroll', (event) => {
            if (
                tablePicker?.classList.contains('hidden')
                || tablePicker?.contains(event.target)
            ) return;
            closeTablePicker();
        }, true);
        window.addEventListener('resize', positionTablePicker);

        imageCutBtn?.addEventListener('click', cutSelectedImage);
        imageCopyBtn?.addEventListener('click', copySelectedImage);
        imagePasteBtn?.addEventListener('click', pasteImageFromToolbar);
        imageDeleteBtn?.addEventListener('click', () => removeSelectedImage());
        imageSizeRange?.addEventListener('input', () => {
            resizeSelectedImage(imageSizeRange.value);
        });

        previewEl.addEventListener('pointerdown', (event) => {
            if (editMode !== 'edit') return;
            const img = event.target?.closest?.('img.kf-editable-image');
            if (!img) clearEditableImageSelection();
        });
        previewEl.addEventListener('click', (event) => {
            const img = event.target?.closest?.('img.kf-editable-image');
            if (!img || !previewEl.contains(img)) return;
            event.preventDefault();
            selectEditableImage(img);
        });
        previewEl.addEventListener('focusin', (event) => {
            const img = event.target?.closest?.('img.kf-editable-image');
            if (img && previewEl.contains(img)) selectEditableImage(img, { focus: false });
        });
        previewEl.addEventListener('copy', (event) => {
            if (!selectedEditableImage || !previewEl.contains(selectedEditableImage)) return;
            event.preventDefault();
            putImageOnClipboard(event, selectedEditableImage);
        });
        previewEl.addEventListener('cut', (event) => {
            if (!selectedEditableImage || !previewEl.contains(selectedEditableImage)) return;
            event.preventDefault();
            if (putImageOnClipboard(event, selectedEditableImage)) {
                removeSelectedImage({ message: 'Image cut. Select its new destination, then paste.' });
            }
        });
        previewEl.addEventListener('keydown', (event) => {
            if (
                selectedEditableImage
                && (event.key === 'Backspace' || event.key === 'Delete')
            ) {
                event.preventDefault();
                removeSelectedImage();
            }
        });
        previewEl.addEventListener('dragstart', (event) => {
            const img = event.target?.closest?.('img.kf-editable-image');
            if (!img || !canEditImagesNow()) return;
            draggedEditableImage = img;
            selectEditableImage(img, { focus: false, reveal: true });
            img.classList.add('kf-image-dragging');
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                try {
                    event.dataTransfer.setData('application/x-koboforge-image-move', 'move');
                    event.dataTransfer.setData('text/plain', img.getAttribute('alt') || 'Document image');
                } catch (_) { /* dragging still works through the in-memory selected image */ }
            }
        });
        previewEl.addEventListener('dragend', () => {
            draggedEditableImage?.classList.remove('kf-image-dragging');
            draggedEditableImage = null;
            previewEl.classList.remove('kf-image-drop-active');
        });

        previewEl.addEventListener('paste', (event) => {
            handleImagePaste(event);
        });
        ['dragenter', 'dragover'].forEach((eventName) => {
            previewEl.addEventListener(eventName, (event) => {
                if (draggedEditableImage && previewEl.contains(draggedEditableImage)) {
                    event.preventDefault();
                    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
                    previewEl.classList.add('kf-image-drop-active');
                    return;
                }
                if (
                    !canEditImagesNow()
                    || !dataTransferHasImage(event.dataTransfer)
                ) return;
                event.preventDefault();
                if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
                previewEl.classList.add('kf-image-drop-active');
            });
        });
        previewEl.addEventListener('dragleave', (event) => {
            if (!previewEl.contains(event.relatedTarget)) {
                previewEl.classList.remove('kf-image-drop-active');
            }
        });
        previewEl.addEventListener('drop', (event) => {
            if (draggedEditableImage && previewEl.contains(draggedEditableImage)) {
                event.preventDefault();
                const image = draggedEditableImage;
                image.classList.remove('kf-image-dragging');
                draggedEditableImage = null;
                previewEl.classList.remove('kf-image-drop-active');
                moveEditableImageToPoint(image, event.clientX, event.clientY);
                return;
            }
            handleImageDrop(event);
        });

        document.addEventListener('selectionchange', () => {
            if (editMode !== 'edit') return;
            updateToolbarActiveState();
            const selection = window.getSelection();
            if (!selection?.rangeCount) return;
            const range = selection.getRangeAt(0);
            if (!rangeLivesInPreview(range)) return;
            if (selectedEditableImage && previewEl.contains(selectedEditableImage)) {
                if (range.intersectsNode(selectedEditableImage)) return;
                clearEditableImageSelection();
            }
            savedEditRange = range.cloneRange();
        });

        previewEl.addEventListener('beforeinput', () => {
            if (editMode === 'edit' && currentOutput) beginEditablePageLock();
        });
        previewEl.addEventListener('input', () => {
            if (editMode !== 'edit' || !currentOutput) return;
            beginEditablePageLock();
            markEdited();
            clearTimeout(commitTimer);
            commitTimer = setTimeout(refreshDiffLive, 80);
        });
        previewEl.addEventListener('keydown', handleEditorTab);

        previewEl.addEventListener('blur', () => {
            if (editMode === 'edit') {
                clearTimeout(commitTimer);
                syncBodyFromUi();
                updateEditChrome();
            }
        });

        applyHtmlBtn?.addEventListener('click', () => {
            if (!currentOutput) return;
            const cleaned = canonicalizeBody(bodyHtmlSource.value);
            currentOutput.bodyHtml = cleaned;
            markEdited();
            refreshOutlineAndStats();
            setEditMode('edit');
            statusEl.textContent = 'HTML applied and saved to the body that Download will use.';
        });

        cancelHtmlBtn?.addEventListener('click', () => setEditMode('edit'));

        function markEdited() {
            bodyEdited = true;
            editedBadge?.classList.remove('hidden');
            if (exportEditHint) {
                exportEditHint.classList.remove('hidden');
                exportEditHint.textContent = 'Edits will be included in Download.';
            }
        }

        function clearEditedFlag() {
            bodyEdited = false;
            editedBadge?.classList.add('hidden');
            updateEditChrome();
            hideDiffPanel();
        }

        function updateEditChrome(precomputedChanges = null) {
            const hasDoc = !!currentOutput;
            if (!exportEditHint) return;
            if (!hasDoc) {
                exportEditHint.classList.add('hidden');
                exportEditHint.textContent = '';
                return;
            }
            syncBodyFromUi();
            const stats = precomputedChanges || buildTrackChangesDocument(
                currentOutput.originalBodyHtml || '',
                currentOutput.bodyHtml || ''
            );
            const changed = stats.navItems.length > 0;
            bodyEdited = changed || bodyEdited;
            if (changed) {
                editedBadge?.classList.remove('hidden');
                exportEditHint.classList.remove('hidden');
                const headBit = stats.headingChanges
                    ? ` · ${stats.headingChanges} heading change${stats.headingChanges === 1 ? '' : 's'}`
                    : '';
                const structureBit = stats.structuredChanges
                    ? ` · ${stats.structuredChanges} formatting/object edit${stats.structuredChanges === 1 ? '' : 's'}`
                    : '';
                exportEditHint.textContent = `Edits will be included in Download: +${stats.added} / −${stats.removed} words${headBit}${structureBit} vs original import.`;
            } else if (bodyEdited) {
                exportEditHint.classList.remove('hidden');
                exportEditHint.textContent = 'Body marked edited (structure/HTML). Download will use the current body.';
            } else {
                exportEditHint.classList.add('hidden');
                exportEditHint.textContent = '';
            }
        }

        function parseHeadingDiffLine(line) {
            const m = /^(#{1,6})\s+(.*)$/.exec(line || '');
            if (!m) return null;
            return { level: m[1].length, text: m[2], hashes: m[1] };
        }

        /** LCS sequence diff for layout entries and word tokens. */
        function sequenceDiff(aItems, bItems) {
            const n = aItems.length;
            const m = bItems.length;
            // Guard huge inputs: fall back to whole-block replace
            if (n * m > 250000) {
                const ops = [];
                aItems.forEach((t) => ops.push({ type: 'del', text: t }));
                bItems.forEach((t) => ops.push({ type: 'add', text: t }));
                return ops;
            }
            const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
            for (let i = n - 1; i >= 0; i -= 1) {
                for (let j = m - 1; j >= 0; j -= 1) {
                    if (aItems[i] === bItems[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
                    else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
                }
            }
            const ops = [];
            let i = 0;
            let j = 0;
            while (i < n && j < m) {
                if (aItems[i] === bItems[j]) {
                    ops.push({ type: 'same', text: aItems[i] });
                    i += 1;
                    j += 1;
                } else if (dp[i + 1][j] >= dp[i][j + 1]) {
                    ops.push({ type: 'del', text: aItems[i] });
                    i += 1;
                } else {
                    ops.push({ type: 'add', text: bItems[j] });
                    j += 1;
                }
            }
            while (i < n) {
                ops.push({ type: 'del', text: aItems[i] });
                i += 1;
            }
            while (j < m) {
                ops.push({ type: 'add', text: bItems[j] });
                j += 1;
            }
            return ops;
        }

        function tokenizeWords(text) {
            // Keep words/punctuation as tokens; headings keep leading # markers as one token each
            const s = String(text || '').trim();
            if (!s) return [];
            const heading = parseHeadingDiffLine(s);
            if (heading) {
                return [`H${heading.level}:`, ...tokenizeWords(heading.text)];
            }
            return s.match(/\S+/g) || [];
        }

        /**
         * Word-level ops for a changed span. Collapses long same-runs to "…" so only
         * changed words (plus a little context) are shown — not the whole paragraph.
         */
        function wordDiffOps(aText, bText) {
            const aW = tokenizeWords(aText);
            const bW = tokenizeWords(bText);
            return sequenceDiff(aW, bW);
        }

        function compressWordOps(ops, contextWords = 2) {
            // Mark indices near changes
            const keep = new Array(ops.length).fill(false);
            ops.forEach((op, idx) => {
                if (op.type === 'same') return;
                for (let k = Math.max(0, idx - contextWords); k <= Math.min(ops.length - 1, idx + contextWords); k += 1) {
                    keep[k] = true;
                }
            });
            const out = [];
            let i = 0;
            while (i < ops.length) {
                if (keep[i]) {
                    out.push(ops[i]);
                    i += 1;
                    continue;
                }
                // skip run of non-kept same tokens → single ellipsis
                let j = i;
                while (j < ops.length && !keep[j]) j += 1;
                if (j > i) out.push({ type: 'ellipsis', text: '…' });
                i = j;
            }
            return out;
        }

        function countWordChanges(wordOps) {
            let added = 0;
            let removed = 0;
            wordOps.forEach((op) => {
                if (op.type === 'add') added += 1;
                if (op.type === 'del') removed += 1;
            });
            return { added, removed };
        }

        function isHeadingToken(tok) {
            return /^H[1-6]:$/.test(tok || '');
        }

        function countHeadingChangesFromWordOps(wordOps) {
            let changes = 0;
            for (let i = 0; i < wordOps.length; i += 1) {
                const op = wordOps[i];
                if (op.type !== 'add' && op.type !== 'del') continue;
                if (isHeadingToken(op.text)) changes += 1;
            }
            // Level change H2: → H1: on same following words: counted as 2 tokens; prefer 1
            for (let i = 0; i < wordOps.length - 1; i += 1) {
                if (wordOps[i].type === 'del' && wordOps[i + 1].type === 'add'
                    && isHeadingToken(wordOps[i].text) && isHeadingToken(wordOps[i + 1].text)) {
                    changes -= 1; // pair as one change
                }
            }
            return Math.max(0, changes);
        }

        function formatWordOpsHtml(wordOps) {
            return wordOps.map((op) => {
                if (op.type === 'ellipsis') {
                    return `<span class="diff-w-sep">${escapeHtml('…')}</span>`;
                }
                if (op.type === 'same') {
                    if (isHeadingToken(op.text)) {
                        const level = op.text.replace(/[^\d]/g, '');
                        return `<span class="diff-h-tag">H${escapeHtml(level)}</span>`;
                    }
                    return `<span class="diff-w-ctx">${escapeHtml(op.text)}</span>`;
                }
                if (op.type === 'add') {
                    if (isHeadingToken(op.text)) {
                        const level = op.text.replace(/[^\d]/g, '');
                        return `<span class="diff-w-add"><span class="diff-h-tag">H${escapeHtml(level)}</span></span>`;
                    }
                    return `<span class="diff-w-add">${escapeHtml('+' + op.text)}</span>`;
                }
                if (op.type === 'del') {
                    if (isHeadingToken(op.text)) {
                        const level = op.text.replace(/[^\d]/g, '');
                        return `<span class="diff-w-del"><span class="diff-h-tag">H${escapeHtml(level)}</span></span>`;
                    }
                    return `<span class="diff-w-del">${escapeHtml('−' + op.text)}</span>`;
                }
                return '';
            }).join(' ');
        }

        function formatChangeDetailsHtml(details) {
            if (!details?.length) return '';
            return '<div class="diff-event-list">'
                + details.map((detail) => (
                    `<span class="diff-event-chip is-${escapeHtml(detail.tone || 'change')}">`
                    + `${escapeHtml(detail.label || 'Structured edit')}</span>`
                )).join('')
                + '</div>';
        }

        function jumpToChange(changeId) {
            if (editMode !== 'diff') setEditMode('diff');
            requestAnimationFrame(() => {
                const items = currentOutput?._diffNav || [];
                const item = items.find((candidate) => String(candidate.id) === String(changeId));
                const needle = String(item?.summary || '')
                    .replace(/^#{1,6}\s+/, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();
                const blocks = Array.from(
                    deviceBookContent.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,th,td')
                );
                const prefix = needle.slice(0, 48);
                const direct = deviceBookContent.querySelector(`#kf-change-${CSS.escape(String(changeId))}`);
                const el = direct || (prefix
                    ? blocks.find((block) => (
                        (block.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
                            .includes(prefix)
                    ))
                    : null);
                if (el) {
                    jumpDeviceToElement(el);
                    el.classList.add('kf-edit-jump');
                    setTimeout(() => el.classList.remove('kf-edit-jump'), 1200);
                } else {
                    const index = Math.max(0, items.indexOf(item));
                    const progress = items.length <= 1 ? 0 : index / (items.length - 1);
                    devicePageIndex = Math.round(progress * Math.max(0, devicePageCount - 1));
                    updateDevicePage();
                }
                diffBody?.querySelectorAll('.diff-hunk').forEach((btn) => {
                    btn.classList.toggle('is-active', btn.dataset.changeId === String(changeId));
                });
            });
        }

        function jumpDeviceToElement(element) {
            if (!element || !deviceBookViewport || !deviceBookContent) return;
            releaseEditablePageLock();
            const pageWidth = Number(deviceBookContent.dataset.pageWidth || 0);
            if (!pageWidth) return;
            const viewportRect = deviceBookViewport.getBoundingClientRect();
            const rect = element.getClientRects()[0] || element.getBoundingClientRect();
            const unshiftedLeft = rect.left - viewportRect.left + (devicePageIndex * pageWidth);
            devicePageIndex = Math.max(
                0,
                Math.min(devicePageCount - 1, Math.floor(Math.max(0, unshiftedLeft) / pageWidth))
            );
            updateDevicePage();
            devicePreview?.focus({ preventScroll: true });
        }

        /**
         * Real-time Edit refresh: sync body ← Kobo DOM, recompute the red/green
         * change index, and repaginate without replacing the editable DOM.
         * Keeping that DOM intact preserves bold, lists, tables, images, and caret.
         */
        function refreshDiffLive() {
            if (editMode !== 'edit' || !currentOutput || !previewEl) return;
            syncBodyFromUi();
            const tc = buildTrackChangesDocument(
                currentOutput.originalBodyHtml || '',
                currentOutput.bodyHtml || ''
            );
            currentOutput._diffNav = tc.navItems;
            paintDiffNavList(tc);
            scheduleDevicePagination();
            updateEditChrome(tc);
        }

        function paintDiffNavList(tc) {
            if (!diffBody) return;
            if (diffSummary) {
                if (!tc.navItems.length) {
                    diffSummary.textContent = 'No differences vs the original import. Return to Edit to make changes.';
                } else {
                    const wordBit = tc.added + tc.removed
                        ? `+${tc.added} words · −${tc.removed} words`
                        : 'No word changes';
                    const headBit = tc.headingChanges
                        ? ` · ${tc.headingChanges} heading change${tc.headingChanges === 1 ? '' : 's'}`
                        : '';
                    const structureBit = tc.structuredChanges
                        ? ` · ${tc.structuredChanges} formatting/object edit${tc.structuredChanges === 1 ? '' : 's'}`
                        : '';
                    diffSummary.textContent = `${wordBit}${headBit}${structureBit} — live · click a row to jump`;
                }
            }
            const rows = [];
            if (!tc.navItems.length) {
                rows.push('<div class="diff-meta">No changes yet. Return to Edit to revise the Kobo document.</div>');
            } else {
                tc.navItems.forEach((item, idx) => {
                    const label = item.summary
                        ? escapeHtml(item.summary.slice(0, 72)) + (item.summary.length > 72 ? '…' : '')
                        : `Change ${idx + 1}`;
                    rows.push(
                        `<button type="button" class="diff-hunk is-${escapeHtml(item.category || 'text')}" data-change-id="${item.id}" title="Jump to this change">`
                        + `<span class="diff-w-ctx">#${idx + 1}</span> `
                        + formatWordOpsHtml(item.wordOps)
                        + formatChangeDetailsHtml(item.details)
                        + `<div class="diff-meta" style="padding-left:0;padding-top:0.25rem">${label}</div>`
                        + `</button>`
                    );
                });
            }
            diffBody.innerHTML = rows.join('');
            diffBody.querySelectorAll('.diff-hunk[data-change-id]').forEach((btn) => {
                btn.addEventListener('click', () => jumpToChange(btn.dataset.changeId));
            });
        }

        function renderDiffPanel() {
            if (!currentOutput || !diffBody) return;
            syncBodyFromUi();
            const tc = buildTrackChangesDocument(
                currentOutput.originalBodyHtml || '',
                currentOutput.bodyHtml || ''
            );
            currentOutput._diffNav = tc.navItems;
            paintDiffNavList(tc);
            diffPanel?.classList.toggle('hidden', editMode !== 'diff');
            updateEditChrome(tc);
        }

        function hideDiffPanel() {
            diffPanel?.classList.add('hidden');
            if (diffBody) diffBody.innerHTML = '';
        }

        /**
         * Canonical body for storage/export:
         * - tables retain only KoboForge-safe classes
         * - PDF page anchors kept as <div class="kf-page-break" data-page="N"></div>
         * - PDF source-page sections retain page position metadata
         * - chapter markers stripped (preview-only)
         * - page labels converted back to page-break anchors
         */
        function canonicalizeBody(html, { forExport = false } = {}) {
            const doc = new DOMParser().parseFromString(
                `<div id="root">${html || ''}</div>`,
                'text/html'
            );
            const root = doc.getElementById('root');
            if (!root) return '';

            // Chapter chrome is never stored
            root.querySelectorAll('.kf-chapter-marker').forEach((el) => el.remove());

            // Convert visible page labels back to stable anchors (survives edit cycles)
            root.querySelectorAll('.kf-page-label').forEach((el) => {
                const page = el.getAttribute('data-page')
                    || (el.id && el.id.replace(/^kf-page-/, ''))
                    || (el.textContent || '').replace(/\D+/g, '');
                const anchor = doc.createElement('div');
                anchor.className = 'kf-page-break';
                if (page) anchor.setAttribute('data-page', page);
                el.replaceWith(anchor);
            });

            // Normalize manual/CSS/DOCX hard breaks. Redundant PDF anchors are
            // dropped because their source-page sections already force a break.
            normalizeHtmlPageBreaks(root, doc, { forExport });

            root.querySelectorAll('.kf-pdf-page').forEach((page) => {
                const sourcePage = Math.max(
                    1,
                    Math.round(Number(page.getAttribute('data-source-page')) || 1)
                );
                const topPercent = Math.max(
                    0,
                    Math.min(100, Math.round(Number(page.getAttribute('data-pdf-top')) || 0))
                );
                const zone = page.classList.contains('kf-page-v-bottom')
                    ? 'bottom'
                    : (page.classList.contains('kf-page-v-middle') ? 'middle' : 'top');
                const offsetName = Array.from(page.classList)
                    .find((name) => /^kf-page-offset-[0-8]$/.test(name))
                    || 'kf-page-offset-0';
                const kindName = page.classList.contains('kf-pdf-image-page')
                    ? ' kf-pdf-image-page'
                    : (page.classList.contains('kf-pdf-blank-page') ? ' kf-pdf-blank-page' : '');
                page.className = `kf-pdf-page kf-page-v-${zone} ${offsetName}${kindName}`;
                page.setAttribute('data-source-page', String(sourcePage));
                page.setAttribute('data-pdf-top', String(topPercent));
            });

            root.querySelectorAll('.kf-note-space').forEach((space) => {
                const lines = Math.max(
                    2,
                    Math.min(12, Math.round(Number(space.getAttribute('data-space-lines')) || 2))
                );
                space.className = `kf-note-space kf-space-${lines}`;
                space.setAttribute('data-space-lines', String(lines));
                space.innerHTML = '';
                space.removeAttribute('title');
                if (forExport) {
                    space.removeAttribute('contenteditable');
                    space.removeAttribute('role');
                    space.removeAttribute('aria-label');
                } else {
                    space.setAttribute('contenteditable', 'false');
                    space.setAttribute('role', 'separator');
                    space.setAttribute('aria-label', 'Preserved blank writing space');
                }
            });

            root.querySelectorAll(
                '[data-kf-align], .kf-align-left, .kf-align-center, .kf-align-right, .kf-align-justify'
            ).forEach((block) => {
                const alignment = block.getAttribute('data-kf-align')
                    || (block.classList.contains('kf-align-center') ? 'center'
                        : block.classList.contains('kf-align-right') ? 'right'
                            : block.classList.contains('kf-align-justify') ? 'justify' : 'left');
                block.classList.remove(
                    'kf-align-left',
                    'kf-align-center',
                    'kf-align-right',
                    'kf-align-justify'
                );
                block.classList.add(`kf-align-${alignment}`);
                block.style.removeProperty('text-align');
                if (forExport) block.removeAttribute('data-kf-align');
                else block.setAttribute('data-kf-align', alignment);
            });

            // Sermon outlines: keep verse numbers as stable <sup class="kf-verse-num">.
            normalizeBibleVerseMarkers(root, doc);
            // Keep list structure stable across edit/export cycles.
            normalizeDocumentLists(root, doc);

            root.querySelectorAll('[data-kf-vpos], [class*="kf-user-vpos-"]').forEach((block) => {
                const position = block.getAttribute('data-kf-vpos')
                    || (block.classList.contains('kf-user-vpos-bottom') ? 'bottom'
                        : block.classList.contains('kf-user-vpos-middle') ? 'middle' : 'top');
                block.classList.remove('kf-user-vpos-top', 'kf-user-vpos-middle', 'kf-user-vpos-bottom');
                block.classList.add(`kf-user-vpos-${position}`);
                block.style.removeProperty('vertical-align');
                if (forExport) block.removeAttribute('data-kf-vpos');
                else block.setAttribute('data-kf-vpos', position);
            });

            root.querySelectorAll('[data-kf-font-size], [class*="kf-user-size-"]').forEach((block) => {
                const size = block.getAttribute('data-kf-font-size')
                    || USER_SIZE_CLASSES
                        .find((name) => block.classList.contains(name))
                        ?.replace('kf-user-size-', '')
                    || '100';
                USER_SIZE_CLASSES.forEach((name) => block.classList.remove(name));
                block.classList.add(`kf-user-size-${size}`);
                if (forExport) block.removeAttribute('data-kf-font-size');
                else block.setAttribute('data-kf-font-size', size);
            });

            root.querySelectorAll('.kf-tab').forEach((tab) => {
                tab.className = 'kf-tab';
                tab.innerHTML = '&#160;';
                if (forExport) {
                    tab.removeAttribute('contenteditable');
                    tab.removeAttribute('aria-label');
                } else {
                    tab.setAttribute('contenteditable', 'false');
                    tab.setAttribute('aria-label', 'Tab');
                }
            });

            root.querySelectorAll('img').forEach((img) => {
                const width = normalizedImageWidth(img);
                const layout = normalizedImageLayout(img);
                img.setAttribute('data-kf-width', String(width));
                img.setAttribute('data-kf-layout', layout);
                applyImageLayoutPresentation(img);
                if (forExport) {
                    [
                        'data-kf-width',
                        'data-kf-width-mode',
                        'data-kf-layout',
                        'data-kf-layout-mode',
                        'data-kf-fit-height',
                        'data-kf-page-images'
                    ].forEach((name) => img.removeAttribute(name));
                }
                img.classList.remove('kf-editable-image', 'kf-image-selected', 'kf-image-dragging');
                if (!img.className) img.removeAttribute('class');
                ['tabindex', 'draggable', 'aria-selected', 'data-tooltip', 'title'].forEach((name) => {
                    img.removeAttribute(name);
                });
            });

            root.querySelectorAll('table').forEach((table) => {
                const safeClasses = Array.from(table.classList).filter((name) => (
                    name === 'kf-user-table'
                    || name === 'kf-pdf-block'
                    || /^kf-align-(left|center|right|justify)$/.test(name)
                    || /^kf-user-vpos-(top|middle|bottom)$/.test(name)
                    || /^kf-user-size-(75|88|100|112|125|150|175)$/.test(name)
                    || name === 'kf-break-before'
                    || name === 'kf-break-after'
                    || /^kf-(?:bold|not-bold|italic|not-italic|underline|strike|no-decoration)$/.test(name)
                ));
                table.setAttribute('class', ['kobo-table', ...safeClasses].join(' '));
                table.querySelectorAll('th, td').forEach((cell) => {
                    const cellClasses = Array.from(cell.classList).filter((name) => (
                        /^kf-align-(left|center|right|justify)$/.test(name)
                        || /^kf-user-vpos-(top|middle|bottom)$/.test(name)
                        || name === 'kf-break-before'
                        || name === 'kf-break-after'
                        || /^kf-(?:bold|not-bold|italic|not-italic|underline|strike|no-decoration)$/.test(name)
                    ));
                    if (cellClasses.length) cell.className = cellClasses.join(' ');
                    else cell.removeAttribute('class');
                });
            });

            normalizeCssTypography(root, doc);

            return root.innerHTML.trim();
        }

        /**
         * Flush the editable Kobo surface or HTML textarea into currentOutput.bodyHtml.
         * Download and mode switches always call this so edits cannot be left only in the DOM.
         */
        function syncBodyFromUi() {
            if (!currentOutput) return '';
            if (editMode === 'html' && bodyHtmlSource && !bodyHtmlSource.classList.contains('hidden')) {
                currentOutput.bodyHtml = canonicalizeBody(bodyHtmlSource.value);
            } else if (
                editMode === 'edit'
                && previewEl
                && previewEl.isContentEditable
            ) {
                const clone = previewEl.cloneNode(true);
                clone.querySelectorAll('.kf-tc-del, del').forEach((el) => el.remove());
                clone.querySelectorAll('.kf-tc-ins, ins').forEach((el) => {
                    const parent = el.parentNode;
                    if (!parent) return;
                    while (el.firstChild) parent.insertBefore(el.firstChild, el);
                    parent.removeChild(el);
                });
                clone.querySelectorAll('[id^="kf-change-"], [data-diff]').forEach((el) => {
                    el.removeAttribute('id');
                    el.removeAttribute('data-diff');
                    el.classList.remove('kf-tc-block', 'is-flash');
                });
                currentOutput.bodyHtml = canonicalizeBody(clone.innerHTML);
            }
            // Diff mode is read-only; its body already lives in currentOutput.
            return currentOutput.bodyHtml || '';
        }

        function paintPreview({ force = false } = {}) {
            if (!currentOutput) {
                renderDevicePreview({ resetPage: true });
                return;
            }
            // Never wipe the contenteditable surface while the user is mid-edit unless forced
            // (mode switch / import). Forced paths must sync first.
            if (
                !force
                && editMode === 'edit'
                && previewEl.isContentEditable
                && bodyEdited
            ) {
                return;
            }
            if (force && (editMode === 'edit' || editMode === 'html')) {
                // Caller should have synced; belt-and-braces for HTML textarea
                if (editMode === 'html') syncBodyFromUi();
            }

            if (editMode === 'edit' || editMode === 'diff') renderDevicePreview();
        }

        function plainFromDiffLine(line) {
            const h = parseHeadingDiffLine(line);
            return h ? h.text : String(line || '');
        }

        function formattedTextTokenRecords(element) {
            if (!element) return [];
            const records = [];
            const walker = element.ownerDocument.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT
            );
            let node = walker.nextNode();
            while (node) {
                if (!node.parentElement?.closest?.('.kf-tc-del')) {
                    const pattern = /\S+/g;
                    let match = pattern.exec(node.nodeValue || '');
                    while (match) {
                        records.push({
                            node,
                            start: match.index,
                            end: match.index + match[0].length
                        });
                        match = pattern.exec(node.nodeValue || '');
                    }
                }
                node = walker.nextNode();
            }
            return records;
        }

        function applyWordOpsToFormattedElement(element, ops, changeId) {
            const currentRecords = formattedTextTokenRecords(element);
            const addedRecordIndexes = [];
            const deletionGroups = [];
            let currentIndex = 0;
            ops.forEach((op) => {
                if (op.type === 'ellipsis' || isHeadingToken(op.text)) return;
                if (op.type === 'del') {
                    const existing = deletionGroups[deletionGroups.length - 1];
                    if (existing?.position === currentIndex) {
                        existing.tokens.push(op.text);
                    } else {
                        deletionGroups.push({
                            position: currentIndex,
                            tokens: [op.text]
                        });
                    }
                    return;
                }
                if (op.type === 'add') addedRecordIndexes.push(currentIndex);
                currentIndex += 1;
            });

            addedRecordIndexes.sort((left, right) => right - left).forEach((index) => {
                const record = currentRecords[index];
                if (!record?.node?.parentNode) return;
                const range = element.ownerDocument.createRange();
                range.setStart(record.node, record.start);
                range.setEnd(record.node, record.end);
                const wrapper = element.ownerDocument.createElement('ins');
                wrapper.className = 'kf-tc-ins';
                wrapper.setAttribute('data-diff', String(changeId));
                range.surroundContents(wrapper);
            });

            const updatedRecords = formattedTextTokenRecords(element);
            deletionGroups.sort((left, right) => right.position - left.position)
                .forEach((group) => {
                    const removed = element.ownerDocument.createElement('del');
                    removed.className = 'kf-tc-del';
                    removed.setAttribute('data-diff', String(changeId));
                    removed.textContent = group.tokens.join(' ');
                    const target = updatedRecords[group.position];
                    if (target?.node?.parentNode) {
                        const addedWrapper = target.node.parentElement?.closest?.(
                            'ins.kf-tc-ins'
                        );
                        if (addedWrapper && element.contains(addedWrapper)) {
                            addedWrapper.parentNode.insertBefore(removed, addedWrapper);
                            addedWrapper.parentNode.insertBefore(
                                element.ownerDocument.createTextNode(' '),
                                addedWrapper
                            );
                        } else {
                            const range = element.ownerDocument.createRange();
                            range.setStart(target.node, target.start);
                            range.collapse(true);
                            range.insertNode(element.ownerDocument.createTextNode(' '));
                            range.insertNode(removed);
                        }
                    } else {
                        if (element.textContent && !/\s$/.test(element.textContent)) {
                            element.appendChild(element.ownerDocument.createTextNode(' '));
                        }
                        element.appendChild(removed);
                    }
                });
        }

        const LAYOUT_DIFF_TEXT_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,li,blockquote';
        const LAYOUT_DIFF_OBJECT_SELECTOR = [
            'figure.kf-document-image',
            'table',
            'img',
            '.kf-note-space',
            '.kf-page-break',
            '.kf-blank-page'
        ].join(',');
        const TRANSIENT_DIFF_CLASSES = new Set([
            'kf-editable-image', 'kf-image-selected', 'kf-image-dragging', 'kf-tc-block',
            'kf-tc-object-add', 'kf-tc-object-del', 'kf-tc-format-change',
            'kf-tc-removed-block', 'kf-edit-jump', 'is-flash',
            'preserve-structure'
        ]);

        function compactText(value) {
            return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function shortChangeText(value, limit = 42) {
            const text = compactText(value);
            if (!text) return '';
            return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
        }

        function semanticElementSignature(element, { ignoreText = false } = {}) {
            if (!element) return '';
            const clone = element.cloneNode(true);
            [clone, ...clone.querySelectorAll('*')].forEach((node) => {
                Array.from(node.classList || []).forEach((name) => {
                    if (TRANSIENT_DIFF_CLASSES.has(name) || name.startsWith('kf-tc-')) {
                        node.classList.remove(name);
                    }
                });
                if (!node.className) node.removeAttribute?.('class');
                [
                    'contenteditable', 'tabindex', 'draggable', 'aria-selected',
                    'data-tooltip', 'title', 'data-diff'
                ].forEach((name) => node.removeAttribute?.(name));
                if (/^kf-change-/.test(node.id || '')) node.removeAttribute('id');
            });
            if (ignoreText) {
                clone.querySelectorAll('br').forEach((br) => br.remove());
                const walker = clone.ownerDocument.createTreeWalker(
                    clone,
                    NodeFilter.SHOW_TEXT
                );
                let node = walker.nextNode();
                while (node) {
                    node.nodeValue = '';
                    node = walker.nextNode();
                }
            }
            const listParents = element.matches?.('li')
                ? (() => {
                    const tags = [];
                    let parent = element.parentElement;
                    while (parent && parent !== element.closest('.kf-pdf-page')) {
                        if (parent.matches('ul,ol')) tags.push(parent.tagName.toLowerCase());
                        parent = parent.parentElement;
                    }
                    return tags.join('>');
                })()
                : '';
            return `${listParents}|${clone.outerHTML}`;
        }

        function inlineTraitText(element, trait) {
            if (!element) return '';
            const texts = [];
            const walker = element.ownerDocument.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT
            );
            let node = walker.nextNode();
            while (node) {
                const text = compactText(node.nodeValue);
                if (text) {
                    let parent = node.parentElement;
                    let active = null;
                    while (parent) {
                        const decoration = [
                            parent.style?.textDecoration,
                            parent.style?.textDecorationLine
                        ].filter(Boolean).join(' ').toLowerCase();
                        const weight = String(parent.style?.fontWeight || '').toLowerCase();
                        const fontStyle = String(parent.style?.fontStyle || '').toLowerCase();
                        if (trait === 'bold') {
                            if (
                                parent.classList.contains('kf-not-bold')
                                || weight === 'normal'
                                || weight === 'lighter'
                                || (weight && Number(weight) <= 400)
                            ) active = false;
                            else if (
                                parent.matches('strong,b')
                                || parent.classList.contains('kf-bold')
                                || weight === 'bold'
                                || weight === 'bolder'
                                || Number(weight) >= 600
                            ) active = true;
                        } else if (trait === 'italic') {
                            if (
                                parent.classList.contains('kf-not-italic')
                                || fontStyle === 'normal'
                            ) active = false;
                            else if (
                                parent.matches('em,i')
                                || parent.classList.contains('kf-italic')
                                || /^(italic|oblique)(?:\s|$)/.test(fontStyle)
                            ) active = true;
                        } else if (trait === 'underline') {
                            if (
                                parent.classList.contains('kf-no-decoration')
                                || decoration.includes('none')
                            ) active = false;
                            else if (
                                parent.matches('u')
                                || parent.classList.contains('kf-underline')
                                || decoration.includes('underline')
                            ) active = true;
                        } else if (trait === 'strikethrough') {
                            if (
                                parent.classList.contains('kf-no-decoration')
                                || decoration.includes('none')
                            ) active = false;
                            else if (
                                parent.matches('s,strike,del')
                                || parent.classList.contains('kf-strike')
                                || decoration.includes('line-through')
                            ) active = true;
                        }
                        if (active !== null) break;
                        if (parent === element) break;
                        parent = parent.parentElement;
                    }
                    if (active === true) texts.push(text);
                }
                node = walker.nextNode();
            }
            return compactText(texts.join(' '));
        }

        function elementDiffText(element) {
            if (!element) return '';
            const clone = element.cloneNode(true);
            clone.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
            return compactText(clone.textContent);
        }

        function explicitLineBreakCount(element) {
            if (!element) return 0;
            let count = element.querySelectorAll('br').length;
            const walker = element.ownerDocument.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT
            );
            let node = walker.nextNode();
            while (node) {
                count += (node.nodeValue?.match(/\n/g) || []).length;
                node = walker.nextNode();
            }
            return count;
        }

        function classValue(element, prefix, fallback = '') {
            const found = Array.from(element?.classList || [])
                .find((name) => name.startsWith(prefix));
            return found ? found.slice(prefix.length) : fallback;
        }

        function entryFormatState(element, type) {
            const target = element;
            const img = type === 'image'
                ? (element?.matches?.('img') ? element : element?.querySelector?.('img'))
                : null;
            const tag = target?.tagName?.toLowerCase?.() || type;
            return {
                tag,
                bold: type === 'text' ? inlineTraitText(target, 'bold') : '',
                italic: type === 'text' ? inlineTraitText(target, 'italic') : '',
                underline: type === 'text' ? inlineTraitText(target, 'underline') : '',
                strikethrough: type === 'text'
                    ? inlineTraitText(target, 'strikethrough')
                    : '',
                alignment: target?.getAttribute?.('data-kf-align')
                    || classValue(target, 'kf-align-', '')
                    || target?.style?.textAlign
                    || '',
                vertical: target?.getAttribute?.('data-kf-vpos')
                    || classValue(target, 'kf-user-vpos-', '')
                    || '',
                fontSize: target?.getAttribute?.('data-kf-font-size')
                    || classValue(target, 'kf-user-size-', '')
                    || target?.style?.fontSize
                    || '',
                fontFamily: target?.style?.fontFamily || '',
                width: img
                    ? (img.getAttribute('data-kf-width') || img.style?.width || '100')
                    : '',
                linkTargets: type === 'text'
                    ? Array.from(target?.querySelectorAll?.('a[href]') || [])
                        .map((link) => link.getAttribute('href'))
                        .join(' | ')
                    : '',
                lineBreaks: type === 'text' ? explicitLineBreakCount(target) : 0,
                pageBreakBefore: !!(
                    target?.matches?.('.kf-break-before')
                    || target?.querySelector?.('.kf-break-before')
                ),
                pageBreakAfter: !!(
                    target?.matches?.('.kf-break-after')
                    || target?.querySelector?.('.kf-break-after')
                ),
                signature: semanticElementSignature(target, { ignoreText: true })
            };
        }

        function changeDetail(label, tone = 'change') {
            return { label, tone };
        }

        function elementKindLabel(entry) {
            if (entry.type === 'image') return 'Image';
            if (entry.type === 'table') return 'Table';
            if (entry.type === 'space') return 'Writing space';
            if (entry.type === 'break') return 'Page break';
            const tag = entry.format?.tag || entry.element?.tagName?.toLowerCase?.() || 'text';
            if (/^h[1-6]$/.test(tag)) return `Heading ${tag.slice(1)}`;
            if (tag === 'blockquote') return 'Block quote';
            if (tag === 'li') return 'List item';
            return 'Paragraph';
        }

        function describeEntryChanges(originalEntry, currentEntry) {
            const details = [];
            const before = originalEntry?.format || {};
            const after = currentEntry?.format || {};
            const traitLabels = {
                bold: 'Bold',
                italic: 'Italic',
                underline: 'Underline',
                strikethrough: 'Strikethrough'
            };
            Object.entries(traitLabels).forEach(([trait, label]) => {
                if ((before[trait] || '') === (after[trait] || '')) return;
                if (!before[trait] && after[trait]) {
                    details.push(changeDetail(
                        `${label} added to “${shortChangeText(after[trait])}”`,
                        'add'
                    ));
                } else if (before[trait] && !after[trait]) {
                    details.push(changeDetail(
                        `${label} removed from “${shortChangeText(before[trait])}”`,
                        'remove'
                    ));
                } else {
                    details.push(changeDetail(`${label} formatting changed`));
                }
            });
            if (before.tag && after.tag && before.tag !== after.tag) {
                details.push(changeDetail(
                    `${elementKindLabel(originalEntry)} → ${elementKindLabel(currentEntry)}`
                ));
            }
            if ((before.alignment || '') !== (after.alignment || '')) {
                details.push(changeDetail(
                    `Alignment: ${before.alignment || 'default'} → ${after.alignment || 'default'}`
                ));
            }
            if ((before.vertical || '') !== (after.vertical || '')) {
                details.push(changeDetail(
                    `Placement: ${before.vertical || 'default'} → ${after.vertical || 'default'}`
                ));
            }
            if ((before.fontSize || '') !== (after.fontSize || '')) {
                details.push(changeDetail(
                    `Font size: ${before.fontSize || 'default'} → ${after.fontSize || 'default'}`
                ));
            }
            if ((before.fontFamily || '') !== (after.fontFamily || '')) {
                details.push(changeDetail(
                    `Font: ${before.fontFamily || 'default'} → ${after.fontFamily || 'default'}`
                ));
            }
            if ((before.width || '') !== (after.width || '')) {
                const widthLabel = (value) => (
                    /^\d+(?:\.\d+)?$/.test(String(value || ''))
                        ? `${value}%`
                        : (value || 'auto')
                );
                details.push(changeDetail(
                    `Image width: ${widthLabel(before.width)} → ${widthLabel(after.width)}`
                ));
            }
            if ((before.linkTargets || '') !== (after.linkTargets || '')) {
                details.push(changeDetail('Link target changed'));
            }
            if ((before.lineBreaks || 0) !== (after.lineBreaks || 0)) {
                details.push(changeDetail(
                    `Line breaks: ${before.lineBreaks || 0} → ${after.lineBreaks || 0}`
                ));
            }
            [
                ['pageBreakBefore', 'before'],
                ['pageBreakAfter', 'after']
            ].forEach(([property, direction]) => {
                if (!!before[property] === !!after[property]) return;
                details.push(changeDetail(
                    `Page break ${after[property] ? 'added' : 'removed'} ${direction} this content`,
                    after[property] ? 'add' : 'remove'
                ));
            });
            if (
                originalEntry?.type === 'table'
                && originalEntry.key !== currentEntry?.key
            ) {
                details.push(changeDetail('Table cells or structure changed'));
            }
            if (
                before.signature !== after.signature
                && !details.length
            ) {
                const fallback = {
                    image: 'Image position or formatting changed',
                    table: 'Table formatting or structure changed',
                    space: 'Writing-space size or structure changed'
                };
                details.push(changeDetail(
                    fallback[originalEntry?.type] || 'Formatting or structure changed'
                ));
            }
            return details;
        }

        function layoutDiffEntries(root) {
            if (!root) return [];
            return Array.from(root.querySelectorAll(
                `${LAYOUT_DIFF_TEXT_SELECTOR},${LAYOUT_DIFF_OBJECT_SELECTOR}`
            )).filter((element) => {
                if (element.matches('.kf-note-space,.kf-page-break,.kf-blank-page')) {
                    return true;
                }
                if (element.matches('figure.kf-document-image,table')) {
                    return !element.parentElement?.closest?.('figure.kf-document-image,table');
                }
                if (element.matches('img')) {
                    return !element.closest('figure.kf-document-image,table');
                }
                if (element.closest('figure.kf-document-image,table')) return false;
                if (element.querySelector(LAYOUT_DIFF_TEXT_SELECTOR)) return false;
                return !!(element.textContent || '').replace(/\s+/g, ' ').trim();
            }).map((element) => {
                if (element.matches('figure.kf-document-image,img')) {
                    const img = element.matches('img') ? element : element.querySelector('img');
                    const source = img?.getAttribute('data-kf-image-id')
                        || img?.getAttribute('src')
                        || img?.getAttribute('alt')
                        || 'image';
                    const entry = {
                        type: 'image',
                        key: `[[image:${source}]]`,
                        identity: source,
                        label: img?.getAttribute('alt') || 'Image',
                        element
                    };
                    entry.format = entryFormatState(element, entry.type);
                    return entry;
                }
                if (element.matches('table')) {
                    const text = elementDiffText(element);
                    const cells = element.querySelectorAll('th,td').length;
                    const entry = {
                        type: 'table',
                        key: `[[table:${cells}:${text}]]`,
                        label: 'Table',
                        element
                    };
                    entry.format = entryFormatState(element, entry.type);
                    return entry;
                }
                if (element.matches('.kf-note-space')) {
                    const lines = element.getAttribute('data-space-lines')
                        || classValue(element, 'kf-space-', 'auto');
                    const entry = {
                        type: 'space',
                        key: `[[space:${lines}]]`,
                        label: 'Writing space',
                        element
                    };
                    entry.format = entryFormatState(element, entry.type);
                    return entry;
                }
                if (element.matches('.kf-page-break,.kf-blank-page')) {
                    const blank = element.classList.contains('kf-blank-page');
                    const entry = {
                        type: 'break',
                        key: blank ? '[[blank-page]]' : '[[page-break]]',
                        label: blank ? 'Blank page' : 'Page break',
                        element
                    };
                    entry.format = entryFormatState(element, entry.type);
                    return entry;
                }
                const tag = element.tagName.toLowerCase();
                const text = elementDiffText(element);
                const entry = {
                    type: 'text',
                    key: /^h[1-6]$/.test(tag)
                        ? `${'#'.repeat(Number(tag.charAt(1)) || 1)} ${text}`
                        : text,
                    label: text,
                    element
                };
                entry.format = entryFormatState(element, entry.type);
                return entry;
            });
        }

        function trackAccumulator() {
            return {
                nextId: 0,
                navItems: [],
                added: 0,
                removed: 0,
                headingChanges: 0,
                structuredChanges: 0,
                sharedMoveKeys: new Set(),
                sharedImageKeys: new Set(),
                sharedImageChanges: new Map()
            };
        }

        function recordLayoutChange(
            acc,
            wordOps,
            summary,
            {
                countWords = true,
                details = [],
                category = 'text',
                structured = !countWords && details.length > 0
            } = {}
        ) {
            const id = acc.nextId;
            acc.nextId += 1;
            if (countWords) {
                const counts = countWordChanges(wordOps);
                acc.added += counts.added;
                acc.removed += counts.removed;
                acc.headingChanges += countHeadingChangesFromWordOps(wordOps);
            }
            if (structured) acc.structuredChanges += 1;
            acc.navItems.push({
                id,
                summary: summary || '',
                wordOps: compressWordOps(wordOps, 2),
                details,
                category
            });
            return id;
        }

        function markChangedElement(element, id) {
            element.id = `kf-change-${id}`;
            element.classList.add('kf-tc-block');
        }

        function wrapElementContents(element, tag, className, id) {
            const wrapper = document.createElement(tag);
            wrapper.className = className;
            wrapper.setAttribute('data-diff', String(id));
            while (element.firstChild) wrapper.appendChild(element.firstChild);
            if (!wrapper.childNodes.length) wrapper.innerHTML = '&#160;';
            element.appendChild(wrapper);
        }

        function entryMovementDetails(entry, direction, acc) {
            if (acc?.sharedMoveKeys?.has(entry.key)) {
                const details = [changeDetail(
                    `${elementKindLabel(entry)} moved ${
                        direction === 'add' ? 'to' : 'from'
                    } this position`,
                    direction
                )];
                if (
                    entry.type === 'image'
                    && direction === 'add'
                    && accSharedImageKey(entry, acc)
                ) {
                    const pair = acc.sharedImageChanges.get(entry.key);
                    if (pair) details.push(...describeEntryChanges(pair.original, pair.current));
                }
                return details;
            }
            return [changeDetail(
                `${elementKindLabel(entry)} ${direction === 'add' ? 'added' : 'removed'}`,
                direction
            )];
        }

        function accSharedImageKey(entry, acc) {
            return !!(
                entry?.type === 'image'
                && acc?.sharedImageKeys?.has(entry.key)
            );
        }

        function markLayoutEntryAdded(entry, acc) {
            const label = entry.type === 'text' ? entry.key : entry.label;
            const ops = wordDiffOps('', label);
            const id = recordLayoutChange(acc, ops, label, {
                countWords: entry.type === 'text',
                details: entryMovementDetails(entry, 'add', acc),
                category: entry.type,
                structured: entry.type !== 'text'
            });
            markChangedElement(entry.element, id);
            if (entry.type === 'text') {
                wrapElementContents(entry.element, 'ins', 'kf-tc-ins', id);
            } else {
                entry.element.classList.add('kf-tc-object-add');
                entry.element.setAttribute('data-diff', String(id));
            }
        }

        function markLayoutEntryRemoved(entry, acc) {
            const label = entry.type === 'text' ? entry.key : entry.label;
            const ops = wordDiffOps(label, '');
            const id = recordLayoutChange(acc, ops, label, {
                countWords: entry.type === 'text',
                details: entryMovementDetails(entry, 'remove', acc),
                category: entry.type,
                structured: entry.type !== 'text'
            });
            markChangedElement(entry.element, id);
            entry.element.classList.add('kf-tc-removed-block');
            if (entry.type === 'text') {
                wrapElementContents(entry.element, 'del', 'kf-tc-del', id);
            } else {
                entry.element.classList.add('kf-tc-object-del');
                entry.element.setAttribute('data-diff', String(id));
            }
        }

        function markLayoutEntryReplacement(originalEntry, currentEntry, acc) {
            const ops = wordDiffOps(originalEntry.key, currentEntry.key);
            const details = describeEntryChanges(originalEntry, currentEntry);
            const id = recordLayoutChange(
                acc,
                ops,
                plainFromDiffLine(currentEntry.key) || plainFromDiffLine(originalEntry.key),
                {
                    details,
                    category: currentEntry.type,
                    structured: details.length > 0
                }
            );
            markChangedElement(currentEntry.element, id);
            if (details.length) currentEntry.element.classList.add('kf-tc-format-change');
            applyWordOpsToFormattedElement(currentEntry.element, ops, id);
        }

        function markLayoutEntryMetadataChange(originalEntry, currentEntry, acc) {
            if (
                !originalEntry
                || !currentEntry
                || originalEntry.format?.signature === currentEntry.format?.signature
            ) {
                return false;
            }
            const details = describeEntryChanges(originalEntry, currentEntry);
            const id = recordLayoutChange(
                acc,
                [],
                currentEntry.label || originalEntry.label || elementKindLabel(currentEntry),
                {
                    countWords: false,
                    details,
                    category: currentEntry.type,
                    structured: true
                }
            );
            markChangedElement(currentEntry.element, id);
            currentEntry.element.classList.add(
                currentEntry.type === 'image' || currentEntry.type === 'table'
                    ? 'kf-tc-object-add'
                    : 'kf-tc-format-change'
            );
            currentEntry.element.setAttribute('data-diff', String(id));
            if (currentEntry.type === 'image' && currentEntry.element.parentNode) {
                const previous = originalEntry.element.cloneNode(true);
                previous.removeAttribute('id');
                previous.classList.remove('kf-editable-image', 'kf-image-selected');
                previous.classList.add('kf-tc-object-del', 'kf-tc-removed-block');
                previous.setAttribute('data-diff', String(id));
                previous.querySelectorAll?.('[id^="kf-change-"]').forEach((node) => {
                    node.removeAttribute('id');
                });
                currentEntry.element.parentNode.insertBefore(
                    previous,
                    currentEntry.element
                );
            }
            return true;
        }

        function markLayoutObjectReplacement(originalEntry, currentEntry, acc) {
            const details = describeEntryChanges(originalEntry, currentEntry);
            if (!details.length) {
                details.push(changeDetail(`${elementKindLabel(currentEntry)} changed`));
            }
            const id = recordLayoutChange(
                acc,
                [],
                currentEntry.label || originalEntry.label || elementKindLabel(currentEntry),
                {
                    countWords: false,
                    details,
                    category: currentEntry.type,
                    structured: true
                }
            );
            const previous = originalEntry.element.cloneNode(true);
            previous.removeAttribute('id');
            previous.classList.remove('kf-editable-image', 'kf-image-selected');
            previous.classList.add('kf-tc-object-del', 'kf-tc-removed-block');
            previous.setAttribute('data-diff', String(id));
            previous.querySelectorAll?.('[id^="kf-change-"]').forEach((node) => {
                node.removeAttribute('id');
            });
            if (currentEntry.element.parentNode) {
                currentEntry.element.parentNode.insertBefore(
                    previous,
                    currentEntry.element
                );
            }
            markChangedElement(currentEntry.element, id);
            currentEntry.element.classList.add('kf-tc-object-add');
            currentEntry.element.setAttribute('data-diff', String(id));
        }

        function insertRemovedLayoutEntry(originalEntry, cloneContainer, beforeEntry, acc) {
            const clone = originalEntry.element.cloneNode(true);
            const staging = document.createElement('div');
            staging.appendChild(clone);
            const clonedEntry = layoutDiffEntries(staging)[0];
            const entry = clonedEntry || {
                ...originalEntry,
                element: clone
            };
            const node = clonedEntry?.element || clone;
            markLayoutEntryRemoved(entry, acc);
            if (beforeEntry?.element?.parentNode) {
                beforeEntry.element.parentNode.insertBefore(node, beforeEntry.element);
            } else if (node.matches('li')) {
                const lists = cloneContainer.querySelectorAll('ul,ol');
                const list = lists[lists.length - 1];
                if (list) list.appendChild(node);
                else cloneContainer.appendChild(node);
            } else {
                cloneContainer.appendChild(node);
            }
        }

        function annotateLayoutDiffContainer(originalContainer, currentContainer, cloneContainer, acc) {
            const originalEntries = layoutDiffEntries(originalContainer);
            const currentEntries = layoutDiffEntries(currentContainer);
            const cloneEntries = layoutDiffEntries(cloneContainer);
            const operations = sequenceDiff(
                originalEntries.map((entry) => entry.key),
                currentEntries.map((entry) => entry.key)
            );
            let operationIndex = 0;
            let originalIndex = 0;
            let currentIndex = 0;

            while (operationIndex < operations.length) {
                if (operations[operationIndex].type === 'same') {
                    markLayoutEntryMetadataChange(
                        originalEntries[originalIndex],
                        cloneEntries[currentIndex],
                        acc
                    );
                    originalIndex += 1;
                    currentIndex += 1;
                    operationIndex += 1;
                    continue;
                }

                const removed = [];
                const added = [];
                while (
                    operationIndex < operations.length
                    && operations[operationIndex].type === 'del'
                ) {
                    removed.push(originalEntries[originalIndex]);
                    originalIndex += 1;
                    operationIndex += 1;
                }
                while (
                    operationIndex < operations.length
                    && operations[operationIndex].type === 'add'
                ) {
                    added.push({
                        source: currentEntries[currentIndex],
                        clone: cloneEntries[currentIndex]
                    });
                    currentIndex += 1;
                    operationIndex += 1;
                }

                const paired = Math.min(removed.length, added.length);
                for (let index = 0; index < paired; index += 1) {
                    const originalEntry = removed[index];
                    const currentEntry = added[index]?.clone;
                    if (!originalEntry || !currentEntry) continue;
                    if (originalEntry.type === 'text' && currentEntry.type === 'text') {
                        markLayoutEntryReplacement(originalEntry, currentEntry, acc);
                    } else if (originalEntry.type === currentEntry.type) {
                        markLayoutObjectReplacement(originalEntry, currentEntry, acc);
                    } else {
                        insertRemovedLayoutEntry(
                            originalEntry,
                            cloneContainer,
                            currentEntry,
                            acc
                        );
                        markLayoutEntryAdded(currentEntry, acc);
                    }
                }

                const firstUnpairedCurrent = added[paired]?.clone
                    || cloneEntries[currentIndex]
                    || null;
                removed.slice(paired).forEach((entry) => {
                    if (entry) {
                        insertRemovedLayoutEntry(
                            entry,
                            cloneContainer,
                            firstUnpairedCurrent,
                            acc
                        );
                    }
                });
                added.slice(paired).forEach(({ clone }) => {
                    if (clone) markLayoutEntryAdded(clone, acc);
                });
            }
        }

        function sharedUniqueImages(originalLayoutEntries, currentLayoutEntries) {
            const entries = (layoutEntries) => {
                const map = new Map();
                layoutEntries
                    .filter((entry) => entry.type === 'image')
                    .forEach((entry) => {
                        const items = map.get(entry.key) || [];
                        items.push(entry);
                        map.set(entry.key, items);
                    });
                return map;
            };
            const originalEntries = entries(originalLayoutEntries);
            const currentEntries = entries(currentLayoutEntries);
            const changes = new Map();
            Array.from(originalEntries.entries()).forEach(([key, items]) => {
                const currentItems = currentEntries.get(key) || [];
                if (items.length === 1 && currentItems.length === 1) {
                    changes.set(key, {
                        original: items[0],
                        current: currentItems[0]
                    });
                }
            });
            return changes;
        }

        function sharedUniqueLayoutKeys(originalLayoutEntries, currentLayoutEntries) {
            const counts = (layoutEntries) => {
                const map = new Map();
                layoutEntries.forEach((entry) => {
                    map.set(entry.key, (map.get(entry.key) || 0) + 1);
                });
                return map;
            };
            const originalCounts = counts(originalLayoutEntries);
            const currentCounts = counts(currentLayoutEntries);
            return new Set(
                Array.from(originalCounts.entries())
                    .filter(([key, count]) => (
                        count === 1 && currentCounts.get(key) === 1
                    ))
                    .map(([key]) => key)
            );
        }

        function pdfPageMap(root) {
            const map = new Map();
            root?.querySelectorAll?.('.kf-pdf-page').forEach((page, index) => {
                const key = String(page.getAttribute('data-source-page') || index + 1);
                map.set(key, page);
            });
            return map;
        }

        function pdfPageLayoutState(page) {
            return {
                top: page?.getAttribute?.('data-pdf-top') || '',
                vertical: classValue(page, 'kf-page-v-', 'top'),
                offset: classValue(page, 'kf-page-offset-', '0'),
                sourcePage: page?.getAttribute?.('data-source-page') || ''
            };
        }

        function markPdfPageMetadataChange(originalPage, clonePage, acc) {
            const before = pdfPageLayoutState(originalPage);
            const after = pdfPageLayoutState(clonePage);
            const details = [];
            if (before.vertical !== after.vertical) {
                details.push(changeDetail(
                    `Page placement: ${before.vertical} → ${after.vertical}`
                ));
            }
            if (before.offset !== after.offset || before.top !== after.top) {
                details.push(changeDetail('Source-page writing space changed'));
            }
            if (before.sourcePage !== after.sourcePage) {
                details.push(changeDetail(
                    `PDF page: ${before.sourcePage || '?'} → ${after.sourcePage || '?'}`
                ));
            }
            if (!details.length) return false;
            const id = recordLayoutChange(
                acc,
                [],
                `PDF page ${after.sourcePage || before.sourcePage || ''}`.trim(),
                {
                    countWords: false,
                    details,
                    category: 'placement',
                    structured: true
                }
            );
            markChangedElement(clonePage, id);
            clonePage.classList.add('kf-tc-format-change');
            clonePage.setAttribute('data-diff', String(id));
            return true;
        }

        /**
         * Layout-aware track changes:
         * clone the current Edit DOM, preserve its PDF pages, tables, images,
         * positioning classes, and note spaces, then annotate changes in-place.
         */
        function buildTrackChangesDocument(originalHtml, currentHtml) {
            const originalDoc = new DOMParser().parseFromString(
                `<div id="root">${originalHtml || ''}</div>`,
                'text/html'
            );
            const currentDoc = new DOMParser().parseFromString(
                `<div id="root">${currentHtml || ''}</div>`,
                'text/html'
            );
            const originalRoot = originalDoc.getElementById('root');
            const currentRoot = currentDoc.getElementById('root');
            const acc = trackAccumulator();
            if (!originalRoot || !currentRoot) {
                return {
                    html: currentHtml || '<p class="kf-tc-empty">No content.</p>',
                    navItems: [],
                    added: 0,
                    removed: 0,
                    headingChanges: 0,
                    structuredChanges: 0
                };
            }

            [originalRoot, currentRoot].forEach((root) => {
                root.querySelectorAll(
                    '.kf-page-label,.kf-chapter-marker'
                ).forEach((element) => element.remove());
            });
            const originalLayoutEntries = layoutDiffEntries(originalRoot);
            const currentLayoutEntries = layoutDiffEntries(currentRoot);
            acc.sharedMoveKeys = sharedUniqueLayoutKeys(
                originalLayoutEntries,
                currentLayoutEntries
            );
            acc.sharedImageChanges = sharedUniqueImages(
                originalLayoutEntries,
                currentLayoutEntries
            );
            acc.sharedImageKeys = new Set(acc.sharedImageChanges.keys());

            const originalPages = pdfPageMap(originalRoot);
            const currentPages = pdfPageMap(currentRoot);
            let html = '';
            if (originalPages.size || currentPages.size) {
                const output = document.createElement('div');
                const keys = Array.from(new Set([
                    ...originalPages.keys(),
                    ...currentPages.keys()
                ])).sort((left, right) => Number(left) - Number(right));
                keys.forEach((key) => {
                    const originalPage = originalPages.get(key);
                    const currentPage = currentPages.get(key);
                    if (currentPage) {
                        const clonePage = currentPage.cloneNode(true);
                        if (originalPage) {
                            markPdfPageMetadataChange(originalPage, clonePage, acc);
                            annotateLayoutDiffContainer(
                                originalPage,
                                currentPage,
                                clonePage,
                                acc
                            );
                        } else {
                            layoutDiffEntries(clonePage).forEach((entry) => {
                                markLayoutEntryAdded(entry, acc);
                            });
                        }
                        output.appendChild(clonePage);
                        return;
                    }
                    if (originalPage) {
                        const clonePage = originalPage.cloneNode(true);
                        clonePage.classList.add('kf-tc-removed-page');
                        layoutDiffEntries(clonePage).forEach((entry) => {
                            markLayoutEntryRemoved(entry, acc);
                        });
                        output.appendChild(clonePage);
                    }
                });
                html = output.innerHTML;
            } else {
                const cloneRoot = currentRoot.cloneNode(true);
                annotateLayoutDiffContainer(
                    originalRoot,
                    currentRoot,
                    cloneRoot,
                    acc
                );
                html = cloneRoot.innerHTML;
            }

            return {
                html: html || '<p class="kf-tc-empty">No content.</p>',
                navItems: acc.navItems,
                added: acc.added,
                removed: acc.removed,
                headingChanges: acc.headingChanges,
                structuredChanges: acc.structuredChanges
            };
        }

        /** @deprecated use syncBodyFromUi — kept as alias for any residual call sites */
        function commitPreviewFromDom() {
            syncBodyFromUi();
            refreshOutlineAndStats();
        }

        function bodyHtmlForExport() {
            clearTimeout(commitTimer);
            // Hard guarantee: whatever is on screen in Edit/HTML is what the EPUB gets
            syncBodyFromUi();
            refreshOutlineAndStats();
            updateEditChrome();
            return canonicalizeBody(currentOutput?.bodyHtml || '', { forExport: true });
        }

        function prettyPrintHtml(html) {
            // Keep inline typography tags adjacent. Adding line breaks between
            // every tag changes inline whitespace when HTML mode round-trips.
            return (html || '')
                .replace(
                    /(<\/(?:div|p|h[1-6]|table|tr|figure|blockquote|ul|ol)>)(?=<)/gi,
                    '$1\n'
                )
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }

        function setProgress(pct, label) {
            if (!progressWrap) return;
            const p = Math.max(0, Math.min(100, Math.round(pct)));
            progressWrap.classList.toggle('hidden', p <= 0 && !label);
            if (progressBar) progressBar.style.width = `${p}%`;
            if (progressPct) progressPct.textContent = `${p}%`;
            if (progressLabel && label) progressLabel.textContent = label;
            if (p >= 100) {
                setTimeout(() => progressWrap.classList.add('hidden'), 600);
            }
        }

        function countWords(html) {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            const text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
            if (!text) return 0;
            return text.split(/\s+/).filter(Boolean).length;
        }

        function countHeadings(html) {
            return (html.match(/<h[12]\b/gi) || []).length;
        }

        function formatFileSize(bytes) {
            const n = Number(bytes) || 0;
            if (n < 1024) return `${n} B`;
            if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
            return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
        }

        function setDropzoneIdle() {
            dropzone?.classList.remove('has-file');
            dropzone?.setAttribute('data-state', 'idle');
            dropzoneIdle?.classList.remove('hidden');
            dropzoneReady?.classList.add('hidden');
            if (dropzoneFileName) dropzoneFileName.textContent = '—';
            if (dropzoneFileMeta) dropzoneFileMeta.textContent = '—';
        }

        function setDropzoneReady(file) {
            if (!file) {
                setDropzoneIdle();
                return;
            }
            const ext = (file.name.split('.').pop() || '').toUpperCase() || 'FILE';
            dropzone?.classList.add('has-file');
            dropzone?.setAttribute('data-state', 'ready');
            dropzoneIdle?.classList.add('hidden');
            dropzoneReady?.classList.remove('hidden');
            if (dropzoneFileName) dropzoneFileName.textContent = file.name;
            if (dropzoneFileMeta) {
                dropzoneFileMeta.textContent = `${ext} · ${formatFileSize(file.size)} · ready in this browser`;
            }
        }

        function clearWorkspace() {
            releaseEditablePageLock();
            documentImageConversionToken += 1;
            clearFixedLayoutCache();
            currentFile = null;
            currentOutput = null;
            selectedEditableImage = null;
            draggedEditableImage = null;
            imageClipboardHtml = '';
            savedEditRange = null;
            updateImageEditControls();
            clearEditedFlag();
            editMode = 'edit';
            previewWrap?.classList.remove('mode-edit', 'mode-diff', 'mode-html');
            previewWrap?.classList.add('mode-edit');
            modeButtons.forEach((b) => {
                const active = b.dataset.mode === 'edit';
                b.classList.toggle('active', active);
                b.classList.toggle('text-slate-300', active);
                b.classList.toggle('text-slate-400', !active);
                b.setAttribute('aria-pressed', String(active));
            });
            downloadBtn.disabled = true;
            if (clearBtn) clearBtn.disabled = true;
            hideDiffPanel();
            statsEl.classList.add('hidden');
            diagnosticsEl.classList.add('hidden');
            diagnosticsEl.innerHTML = '';
            pageChips.classList.add('hidden');
            pageChipsInner.innerHTML = '';
            chapterOutlineWrap.classList.add('hidden');
            chapterOutline.innerHTML = '';
            previewEl.innerHTML = '<p class="kf-empty-hint">Load a document to edit directly in its paginated Kobo layout.</p>';
            previewEl.contentEditable = 'false';
            previewEl.classList.remove('kf-editing');
            devicePreview?.classList.add('hidden');
            devicePageIndex = 0;
            devicePageCount = 1;
            updateDevicePage();
            bodyHtmlSource.classList.add('hidden');
            htmlToolbar.classList.add('hidden');
            editToolbar?.classList.add('hidden');
            statusEl.textContent = 'Waiting for a document.';
            bookTitleInput.value = '';
            if (fileInput) fileInput.value = '';
            setProgress(0);
            setDropzoneIdle();
            updateEpubLayoutUi();
            if (exportEditHint) {
                exportEditHint.classList.add('hidden');
                exportEditHint.textContent = '';
            }
        }

        clearBtn?.addEventListener('click', clearWorkspace);
        cancelFileBtn?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (bodyEdited && currentOutput) {
                const ok = confirm('Cancel will discard the loaded file and any body edits. Continue?');
                if (!ok) return;
            }
            clearWorkspace();
        });

        function waitForGlobal(name, timeoutMs = 12000) {
            if (window[name]) return Promise.resolve(window[name]);
            return new Promise((resolve, reject) => {
                const start = Date.now();
                const id = setInterval(() => {
                    if (window[name]) {
                        clearInterval(id);
                        resolve(window[name]);
                    } else if (Date.now() - start > timeoutMs) {
                        clearInterval(id);
                        reject(new Error(`${name} failed to load`));
                    }
                }, 40);
            });
        }

        function openFilePicker() {
            if (fileInput) fileInput.click();
        }

        pickFileBtn?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openFilePicker();
        });
        replaceFileBtn?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openFilePicker();
        });
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (file) processFile(file);
        });

        ['dragenter', 'dragover'].forEach((eventName) => {
            dropzone.addEventListener(eventName, (event) => {
                event.preventDefault();
                dropzone.classList.add('dropzone-active');
            });
        });

        ['dragleave', 'drop'].forEach((eventName) => {
            dropzone.addEventListener(eventName, (event) => {
                event.preventDefault();
                dropzone.classList.remove('dropzone-active');
            });
        });

        dropzone.addEventListener('drop', (event) => {
            const file = event.dataTransfer?.files?.[0];
            if (file) processFile(file);
        });

        downloadBtn.addEventListener('click', async () => {
            if (!currentOutput) return;
            try {
                const title = bookTitleInput.value.trim() || currentOutput.title;
                const author = bookAuthorInput.value.trim() || currentOutput.author || 'Unknown';
                const lang = (bookLangInput?.value || 'en').trim() || 'en';
                statusEl.textContent = 'Syncing edits into EPUB body…';
                setProgress(8, 'Syncing edits');
                const bodyHtml = bodyHtmlForExport();
                const stats = buildTrackChangesDocument(
                    currentOutput.originalBodyHtml || '',
                    bodyHtml
                );
                const headBit = stats.headingChanges
                    ? `, ${stats.headingChanges} heading`
                    : '';
                const structureBit = stats.structuredChanges
                    ? `, ${stats.structuredChanges} formatting/object`
                    : '';
                statusEl.textContent = stats.navItems.length
                    ? `Building EPUB with your edits (+${stats.added}/−${stats.removed}${headBit}${structureBit})…`
                    : 'Building reflowable EPUB locally…';
                setProgress(20, 'Building EPUB');
                const split = !!(splitChaptersEl && splitChaptersEl.checked);
                const blob = await buildEpubBlob({
                    title,
                    author,
                    lang,
                    bodyHtml,
                    splitChapters: split
                });
                setProgress(90, 'Preparing download');
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const base = currentFile?.name?.replace(/\.[^.]+$/, '') || title;
                const outputBase = slugify(title || base) || 'koboforge-output';
                link.download = `${outputBase}.epub`;
                link.click();
                URL.revokeObjectURL(url);
                setProgress(100, 'Done');
                savePrefs();
                statusEl.textContent = stats.navItems.length
                    ? `EPUB downloaded with your edits (+${stats.added}/−${stats.removed}${headBit}${structureBit} vs import). Nothing left your browser.`
                    : 'Reflowable EPUB ready. Nothing left your browser.';
                if (editMode === 'diff') renderDiffPanel();
            } catch (error) {
                console.error('[KoboForge]', error);
                statusEl.textContent = error.message || 'EPUB build failed.';
                setProgress(0);
            }
        });

        async function processFile(file) {
            releaseEditablePageLock();
            if (bodyEdited && currentOutput) {
                const ok = confirm('Loading a new file will discard your body edits. Continue?');
                if (!ok) {
                    if (fileInput) fileInput.value = '';
                    return;
                }
            }
            documentImageConversionToken += 1;
            clearFixedLayoutCache();
            currentFile = file;
            currentOutput = null;
            selectedEditableImage = null;
            draggedEditableImage = null;
            imageClipboardHtml = '';
            savedEditRange = null;
            updateImageEditControls();
            clearEditedFlag();
            previewEl.contentEditable = 'false';
            previewEl.classList.remove('kf-editing', 'kf-diffing', 'kf-fixed-preview');
            setDropzoneReady(file);
            downloadBtn.disabled = true;
            if (clearBtn) clearBtn.disabled = false;
            statsEl.classList.add('hidden');
            diagnosticsEl.classList.add('hidden');
            pageChips.classList.add('hidden');
            chapterOutlineWrap.classList.add('hidden');
            previewEl.innerHTML = '<p class="kf-empty-hint">Processing…</p>';
            statusEl.textContent = `Reading ${file.name} locally…`;
            if (!bookTitleInput.value.trim()) {
                bookTitleInput.value = file.name.replace(/\.[^.]+$/, '');
            }
            setProgress(5, 'Reading file');

            try {
                const ext = file.name.split('.').pop().toLowerCase();
                let output;
                if (ext === 'docx') {
                    setProgress(30, 'Parsing DOCX');
                    output = await parseDocx(file);
                } else if (ext === 'pdf') {
                    output = await parsePdf(file);
                } else if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
                    setProgress(40, 'Parsing text');
                    output = await parsePlainText(file, ext);
                } else {
                    throw new Error('Unsupported file type. Use DOCX, PDF, TXT, or Markdown.');
                }

                setProgress(90, 'Rendering preview');
                currentOutput = output;
                const canonical = canonicalizeBody(output.bodyHtml);
                // Snapshot for git-like diff; export always uses bodyHtml after sync
                currentOutput.originalBodyHtml = canonical;
                currentOutput.bodyHtml = canonical;
                clearEditedFlag();
                updateEpubLayoutUi();
                if (resolvedEpubLayout() === 'fixed') {
                    setProgress(90, 'Rendering fixed pages');
                    await ensureFixedLayoutPages();
                }
                refreshOutlineAndStats();
                // Open the converted document directly in the selected Kobo editor.
                devicePageIndex = 0;
                setEditMode('edit');
                statusEl.textContent = conciseReadyStatus(output);
                downloadBtn.disabled = false;
                updateEditChrome();
                setProgress(100, 'Ready');
            } catch (error) {
                console.error('[KoboForge]', error);
                statusEl.textContent = error.message || 'Failed to process file.';
                previewEl.innerHTML = '<p class="kf-empty-hint">Processing failed. Try DOCX for the cleanest result, or a simpler PDF. Scanned PDFs need OCR first.</p>';
                setProgress(0);
            }
        }

        function refreshOutlineAndStats() {
            if (!currentOutput) return;
            const html = currentOutput.bodyHtml;
            const title = bookTitleInput.value.trim() || currentOutput.title;
            const split = !!splitChaptersEl?.checked;
            const chapters = split
                ? splitBodyIntoChapters(html, title)
                : [{ id: 'ch1', title, html }];

            currentOutput.chapters = chapters;
            const headingCount = countHeadings(html);
            const words = countWords(html);

            statFormat.textContent = `${currentOutput.formatLabel} · editable`;
            if (statWords) {
                const count = String(words).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                statWords.textContent = `${count} words`;
            }
            if (statChapters) {
                const count = chapters.length;
                statChapters.textContent = `${count} section${count === 1 ? '' : 's'}`;
            }
            statsEl.classList.remove('hidden');

            // Outline
            chapterOutline.innerHTML = '';
            if (chapters.length) {
                chapterOutlineWrap.classList.remove('hidden');
                chapters.forEach((ch, i) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-white/25';
                    btn.textContent = `${i + 1}. ${ch.title}`;
                    btn.addEventListener('click', () => {
                        // Outline navigation opens the shared paginated Kobo editor.
                        if (editMode !== 'edit') setEditMode('edit');
                        const heads = previewEl.querySelectorAll('h1, h2');
                        const offset = (chapters[0]?.title === 'Front matter') ? 1 : 0;
                        let el;
                        if (i === 0 && chapters[0]?.title === 'Front matter') {
                            el = previewEl.firstElementChild;
                        } else {
                            el = heads[i - offset] || heads[Math.min(i, heads.length - 1)];
                        }
                        if (el) jumpDeviceToElement(el);
                        else {
                            devicePageIndex = 0;
                            updateDevicePage();
                        }
                        chapterOutline.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
                        btn.classList.add('active');
                    });
                    chapterOutline.appendChild(btn);
                });
                if (split && chapters.length === 1 && headingCount === 0) {
                    chapterOutlineHint.textContent = 'No H1/H2 — single spine item. Add headings in Edit.';
                } else if (!split) {
                    chapterOutlineHint.textContent = 'Chapter split off — one file in EPUB.';
                } else {
                    chapterOutlineHint.textContent = `${chapters.length} spine item${chapters.length === 1 ? '' : 's'}`;
                }
            } else {
                chapterOutlineWrap.classList.add('hidden');
            }

            // Page chips
            const pages = currentOutput.pageCount || 0;
            if (pages > 0) {
                pageChips.classList.remove('hidden');
                pageChipsInner.innerHTML = '';
                for (let p = 1; p <= pages; p += 1) {
                    const chip = document.createElement('button');
                    chip.type = 'button';
                    chip.className = 'rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:border-[#C9A227]/40';
                    chip.textContent = String(p);
                    chip.title = `Jump near PDF source page ${p} in the Kobo layout`;
                    chip.addEventListener('click', () => {
                        if (editMode !== 'edit') setEditMode('edit');
                        requestAnimationFrame(() => {
                            const sourceSection = resolvedEpubLayout() === 'fixed'
                                ? previewEl.querySelector(
                                    `.kf-fixed-preview-page:nth-child(${p})`
                                )
                                : previewEl.querySelector(
                                    `.kf-pdf-page[data-source-page="${p}"]`
                                );
                            if (sourceSection) {
                                jumpDeviceToElement(sourceSection);
                                return;
                            }
                            const progress = pages <= 1 ? 0 : (p - 1) / (pages - 1);
                            devicePageIndex = Math.round(
                                progress * Math.max(0, devicePageCount - 1)
                            );
                            updateDevicePage();
                        });
                    });
                    pageChipsInner.appendChild(chip);
                }
            } else {
                pageChips.classList.add('hidden');
            }

            renderDiagnostics(currentOutput);
        }

        function renderDiagnostics(out) {
            const warnings = out.warnings || [];
            let level = 'ok';
            let observation = 'Ready to review and export.';
            if (out.formatLabel === 'PDF' && out.emptyPages?.length) {
                const count = out.emptyPages.length;
                observation = `${count} blank source page${count === 1 ? '' : 's'} preserved.`;
            } else if (warnings.length) {
                level = 'warn';
                observation = 'Converted with a source issue to spot-check.';
            } else if (bodyEdited) {
                observation = 'Edited version is ready to export.';
            } else if (out.imageCount > 0) {
                observation = `${out.imageCount} image${out.imageCount === 1 ? '' : 's'} kept inline.`;
            } else if (out.formatLabel === 'PDF') {
                observation = 'PDF structure reflowed for editing.';
            }

            diagnosticsEl.textContent = observation;
            diagnosticsEl.classList.remove('diag-warn', 'diag-ok', 'diag-info');
            diagnosticsEl.classList.add(level === 'warn' ? 'diag-warn' : 'diag-ok');
            diagnosticsEl.classList.remove('hidden');
        }

        async function parseDocx(file) {
            const arrayBuffer = await file.arrayBuffer();
            const mammoth = await waitForGlobal('mammoth');
            const warnings = [];
            let skippedImages = 0;
            let docxInput = arrayBuffer;
            let fidelityStats = null;
            let listPlan = [];
            try {
                const JSZipCtor = await waitForGlobal('JSZip');
                const normalized = await prepareDocxForFidelity(arrayBuffer, { JSZipCtor });
                docxInput = normalized.arrayBuffer;
                fidelityStats = normalized.stats;
                listPlan = normalized.listPlan || [];
            } catch (error) {
                console.warn('[KoboForge] DOCX fidelity preprocessing', error);
                warnings.push(
                    'Some inherited Word formatting or paragraph-level page breaks could not be normalized.'
                );
            }
            // Accept normal camera-sized source images, then resize them to the
            // selected Kobo screen instead of dropping useful artwork up front.
            const MAX_SOURCE_IMAGE_B64 = Math.floor(12 * 1024 * 1024 * 1.37);
            const convertInput = { arrayBuffer: docxInput };
            const convertOptions = {
                styleMap: DOCX_FIDELITY_STYLE_MAP,
                ignoreEmptyParagraphs: false
            };
            if (mammoth.images?.imgElement) {
                convertOptions.convertImage = mammoth.images.imgElement((image) =>
                    image.read('base64').then((b64) => {
                        if (!b64 || b64.length > MAX_SOURCE_IMAGE_B64) {
                            skippedImages += 1;
                            return {
                                src: '',
                                alt: image.altText || 'Image omitted (source exceeded 12 MB)'
                            };
                        }
                        return { src: `data:${image.contentType};base64,${b64}` };
                    }).catch(() => {
                        skippedImages += 1;
                        return { src: '', alt: 'Image could not be read' };
                    })
                );
            }
            const result = await mammoth.convertToHtml(convertInput, convertOptions);
            const doc = new DOMParser().parseFromString(
                stripInvalidXmlChars(result.value || ''),
                'text/html'
            );
            // Normalize Word superscript/subscript verse numbers before image work
            // so later export/canonicalize keeps full verse prose after markers.
            normalizeBibleVerseMarkers(doc.body, doc);
            // Rebuild DOCX lists (mammoth splits on empty paras / mis-nests levels).
            normalizeDocumentLists(doc.body, doc, { listPlan });
            // Drop empty/broken img tags from oversized images so EPUB XHTML stays valid
            doc.body.querySelectorAll('img').forEach((img) => {
                const src = img.getAttribute('src') || '';
                if (!src || src === 'about:blank') {
                    const note = doc.createElement('p');
                    note.className = 'preserve-structure';
                    note.innerHTML = `<em>[${escapeHtml(img.getAttribute('alt') || 'Image omitted')}]</em>`;
                    img.replaceWith(note);
                }
            });
            setProgress(68, 'Optimizing DOCX images');
            const optimized = await optimizeDocumentImages(doc.body.innerHTML);
            const paragraphCount = doc.body.querySelectorAll('p, li, blockquote').length || 1;
            const messages = (result.messages || [])
                .map((m) => m.message || String(m))
                .filter(Boolean);
            if (!doc.body.querySelector('h1, h2, h3')) {
                warnings.push('DOCX has no headings — consider adding them in Word, or insert <h2> in HTML edit for a Kobo TOC.');
            }
            if (skippedImages > 0) {
                warnings.push(
                    `Skipped ${skippedImages} unreadable or unusually large image(s). Keep each source image below 12 MB.`
                );
            }
            if (fidelityStats?.paritySectionBreaks > 0) {
                warnings.push(
                    `${fidelityStats.paritySectionBreaks} odd/even Word section start(s) were preserved as hard page breaks; exact left/right parity can change when text reflows.`
                );
            }
            if (optimized.failed > 0) {
                warnings.push(`Could not optimize ${optimized.failed} DOCX image(s); their source markup was kept where possible.`);
            }
            const imgCount = optimized.imageCount;
            const target = documentImageTarget();
            return {
                title: file.name.replace(/\.[^.]+$/, ''),
                author: '',
                bodyHtml: optimized.html,
                paragraphCount,
                formatLabel: 'DOCX',
                structureNote: imgCount
                    ? `Native paragraphs + ${imgCount} Kobo-optimized image(s)`
                    : 'Native paragraphs preserved',
                status: imgCount
                    ? `DOCX parsed locally. ${imgCount} embedded image${imgCount === 1 ? '' : 's'} automatically optimized for the selected Kobo and kept inline.`
                    : 'DOCX parsed locally. Paragraph and heading structure preserved from the source document.',
                warnings,
                mammothMessages: messages,
                imageSources: optimized.imageSources,
                imageVariants: optimized.imageVariants,
                imageCount: imgCount,
                imageTarget: `${target.profile.name} · ${target.orientation}`,
                pageCount: 0
            };
        }

        function preserveTablesEnabled() {
            const el = document.getElementById('preserveTables');
            return !el || el.checked;
        }

        async function parsePlainText(file, ext) {
            const text = await file.text();
            const html = ext === 'txt'
                ? plainTextToStructuredHtml(text)
                : markdownLikeToHtml(text);
            const paragraphCount = (html.match(/<p/g) || []).length || 1;
            const tableCount = (html.match(/<table/gi) || []).length;
            return {
                title: file.name.replace(/\.[^.]+$/, ''),
                author: '',
                bodyHtml: html,
                paragraphCount,
                formatLabel: ext === 'txt' ? 'TXT' : 'Markdown',
                structureNote: tableCount
                    ? `${tableCount} table${tableCount === 1 ? '' : 's'} + paragraphs`
                    : 'Blank lines and indentation preserved',
                status: tableCount
                    ? `${ext.toUpperCase()} parsed locally. ${tableCount} Markdown table${tableCount === 1 ? '' : 's'} converted to HTML for Kobo.`
                    : `${ext.toUpperCase()} parsed locally with paragraph breaks and indentation preserved.`,
                warnings: [],
                pageCount: 0
            };
        }

        function pdfImageObject(page, objectId) {
            if (!objectId) return Promise.resolve(null);
            try {
                const ready = page.objs.get(objectId);
                if (ready) return Promise.resolve(ready);
            } catch (_) { /* object may still resolve through the callback */ }
            return new Promise((resolve) => {
                let settled = false;
                const finish = (value) => {
                    if (settled) return;
                    settled = true;
                    resolve(value || null);
                };
                try {
                    page.objs.get(objectId, finish);
                } catch (_) {
                    finish(null);
                    return;
                }
                setTimeout(() => finish(null), 800);
            });
        }

        function pdfImageToCanvas(image) {
            if (!image) return null;
            const source = image.bitmap || image;
            const width = Math.max(0, Number(source.width || image.width) || 0);
            const height = Math.max(0, Number(source.height || image.height) || 0);
            if (!width || !height) return null;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) return null;

            const raw = image.data;
            if (!raw) {
                try {
                    context.drawImage(source, 0, 0, width, height);
                    return canvas;
                } catch (_) {
                    return null;
                }
            }

            const pixelCount = width * height;
            const rgba = new Uint8ClampedArray(pixelCount * 4);
            if (raw.length >= pixelCount * 4) {
                rgba.set(raw.subarray(0, pixelCount * 4));
            } else if (raw.length >= pixelCount * 3) {
                for (let p = 0, s = 0, d = 0; p < pixelCount; p += 1, s += 3, d += 4) {
                    rgba[d] = raw[s];
                    rgba[d + 1] = raw[s + 1];
                    rgba[d + 2] = raw[s + 2];
                    rgba[d + 3] = 255;
                }
            } else if (raw.length >= pixelCount) {
                for (let p = 0, d = 0; p < pixelCount; p += 1, d += 4) {
                    rgba[d] = raw[p];
                    rgba[d + 1] = raw[p];
                    rgba[d + 2] = raw[p];
                    rgba[d + 3] = 255;
                }
            } else {
                // PDF.js 1-bit grayscale images use padded packed rows.
                const rowBytes = Math.ceil(width / 8);
                if (raw.length < rowBytes * height) return null;
                for (let y = 0; y < height; y += 1) {
                    for (let x = 0; x < width; x += 1) {
                        const byte = raw[(y * rowBytes) + Math.floor(x / 8)];
                        const gray = (byte & (128 >> (x % 8))) ? 255 : 0;
                        const d = ((y * width) + x) * 4;
                        rgba[d] = gray;
                        rgba[d + 1] = gray;
                        rgba[d + 2] = gray;
                        rgba[d + 3] = 255;
                    }
                }
            }
            context.putImageData(new ImageData(rgba, width, height), 0, 0);
            return canvas;
        }

        function normalizePdfFontName(name) {
            return String(name || '')
                .replace(/^[A-Z]{6}\+/, '')
                .replace(/[_-]+/g, ' ')
                .trim();
        }

        /**
         * Reduce PDF font names to portable EPUB traits. The original embedded
         * font cannot safely be copied out of a PDF (and often has a restricted
         * subset), so KoboForge retains its family type, weight, slant, and
         * relative size using Kobo-safe CSS stacks.
         */
        function describePdfFont(name, fallbackFamily = '') {
            const sourceName = normalizePdfFontName(name || fallbackFamily);
            const sourceKey = sourceName.toLowerCase();
            const key = `${sourceName} ${fallbackFamily}`.toLowerCase();
            let family = /\bserif\b/.test(String(fallbackFamily).toLowerCase())
                && !/\bsans[- ]?serif\b/.test(String(fallbackFamily).toLowerCase())
                ? 'serif'
                : 'sans';
            if (/(script|hand|brush|calligraph|amsterdam|cursive)/.test(sourceKey)) {
                family = 'script';
            } else if (/(mono|courier|consolas|menlo|typewriter|code)/.test(sourceKey)) {
                family = 'mono';
            } else if (/(serif|times|georgia|garamond|baskerville|palatino|playfair|cooper|cambria|bookman|didot|bodoni|caslon|lora|merriweather|constantia)/.test(sourceKey)) {
                family = 'serif';
            } else if (/(sans|arial|helvetica|montserrat|garet|canva|roboto|calibri|avenir|verdana|futura|gotham|lato)/.test(sourceKey)) {
                family = 'sans';
            }
            return {
                sourceName: sourceName || fallbackFamily || 'Unknown',
                family,
                bold: /(bold|black|heavy|semibold|semi bold|demi)/.test(key),
                italic: /(italic|oblique|slanted)/.test(key),
                light: /(light|thin|extralight|extra light)/.test(key)
            };
        }

        function collectPdfFontMetadata(page, textContent) {
            const metadata = {};
            const styles = textContent?.styles || {};
            const fontNames = new Set(
                (textContent?.items || []).map((item) => item?.fontName).filter(Boolean)
            );
            fontNames.forEach((fontName) => {
                const style = styles[fontName] || {};
                let fontObject = null;
                try {
                    // Font objects resolve after getOperatorList(). Keep this
                    // guarded because malformed PDFs may omit one font object.
                    fontObject = page.commonObjs.get(fontName);
                } catch (_) { /* use the PDF.js fallback family below */ }
                metadata[fontName] = describePdfFont(
                    fontObject?.name || fontObject?.fallbackName || style.fontFamily || fontName,
                    style.fontFamily || fontObject?.fallbackName || ''
                );
            });
            return metadata;
        }

        async function extractPdfPageImages(page, resolvedOperatorList = null) {
            const operatorList = resolvedOperatorList || await page.getOperatorList();
            const ops = pdfjsLib.OPS || {};
            const objectOps = new Set([
                ops.paintImageXObject,
                ops.paintJpegXObject,
                ops.paintImageXObjectRepeat
            ].filter(Number.isFinite));
            const inlineOps = new Set([
                ops.paintInlineImageXObject,
                ops.paintInlineImageXObjectGroup
            ].filter(Number.isFinite));
            const seen = new Set();
            const images = [];

            for (let index = 0; index < operatorList.fnArray.length; index += 1) {
                const fn = operatorList.fnArray[index];
                const args = operatorList.argsArray[index] || [];
                let image = null;
                if (inlineOps.has(fn)) {
                    image = args[0] || null;
                } else if (objectOps.has(fn)) {
                    const objectId = args[0];
                    if (!objectId || seen.has(objectId)) continue;
                    seen.add(objectId);
                    image = await pdfImageObject(page, objectId);
                } else {
                    continue;
                }

                const canvas = pdfImageToCanvas(image);
                if (!canvas || canvas.width < 24 || canvas.height < 24 || canvas.width * canvas.height < 2048) {
                    continue;
                }
                images.push(canvas.toDataURL('image/png'));
            }
            return images;
        }

        async function renderPdfPageAsImage(page) {
            const target = documentImageTarget();
            const base = page.getViewport({ scale: 1 });
            const scale = Math.max(
                1,
                Math.min(2.5, target.width / base.width, target.height / base.height)
            );
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(viewport.width));
            canvas.height = Math.max(1, Math.round(viewport.height));
            const context = canvas.getContext('2d', { alpha: false });
            if (!context) return '';
            context.fillStyle = '#f4f1e8';
            context.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: context, viewport }).promise;
            return canvas.toDataURL('image/jpeg', 0.88);
        }

        function summarizePdfPageDesign({
            textContent,
            operatorList,
            pageBlocks,
            pageImages,
            tableGeometry,
            viewport
        }) {
            const ops = pdfjsLib.OPS || {};
            const imageOps = new Set([
                ops.paintImageXObject,
                ops.paintJpegXObject,
                ops.paintInlineImageXObject,
                ops.paintImageMaskXObject,
                ops.paintSolidColorImageMask
            ].filter(Number.isFinite));
            const functions = operatorList?.fnArray || [];
            const imageOperatorCount = functions.filter((fn) => imageOps.has(fn)).length;
            const vectorPathCount = Number.isFinite(ops.constructPath)
                ? functions.filter((fn) => fn === ops.constructPath).length
                : 0;
            const items = (textContent?.items || []).filter((item) => (
                item?.str && item?.transform?.length >= 6
            ));
            const pageWidth = Math.max(1, Number(viewport?.width) || 1);
            const xClusters = new Set(items.map((item) => (
                Math.round((Number(item.transform[4]) || 0) / pageWidth * 20)
            )));
            const fonts = new Set(items.map((item) => item.fontName).filter(Boolean));
            const blocks = Array.from(pageBlocks || []);

            return {
                textItemCount: items.length,
                imageCount: pageImages?.length || 0,
                imageOperatorCount,
                imageOnly: blocks.length === 0 && (
                    (pageImages?.length || 0) > 0
                    || imageOperatorCount > 0
                ),
                readingColumns: Number(pageBlocks?.pageLayout?.readingColumns) || 1,
                hasGrid: !!tableGeometry?.hasGrid,
                vectorPathCount,
                fontCount: fonts.size,
                xClusterCount: xClusters.size,
                noteSpaceCount: blocks.filter((block) => block.type === 'spacer').length
            };
        }

        async function parsePdf(file) {
            await loadPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            setProgress(12, 'Opening PDF');
            // Copy into a fresh Uint8Array. PDF.js may transfer the buffer to the
            // worker; a detached ArrayBuffer after page 1 is a common multipage hang.
            const data = new Uint8Array(arrayBuffer.slice(0));
            let pdf;
            try {
                pdf = await pdfjsLib.getDocument({
                    data,
                    useSystemFonts: true,
                    isEvalSupported: false
                }).promise;
            } catch (openErr) {
                console.error('[KoboForge] PDF open failed', openErr);
                throw new Error(
                    openErr?.message
                        ? `Could not open PDF: ${openErr.message}`
                        : 'Could not open PDF. Try re-exporting or use DOCX.'
                );
            }

            const parts = [];
            let tableCount = 0;
            let headingCount = 0;
            let noteSpaceCount = 0;
            let readingColumnPageCount = 0;
            let detectedImageCount = 0;
            const detectedFontFamilies = new Set();
            const emptyPages = [];
            const imageOnlyPages = [];
            const failedPages = [];
            const pageDesignSignals = [];
            const total = pdf.numPages || 1;
            const warnings = [];

            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                const pageParts = [];
                let sourcePageKind = '';
                let pageLayout = {
                    startZone: 'top',
                    offsetLevel: 0,
                    topRatio: 0,
                    remainingRatio: 0.92
                };
                let pageDesignSignal = {};
                try {
                    const page = await pdf.getPage(pageNumber);
                    const textContent = await page.getTextContent();
                    let operatorList = null;
                    try {
                        // Resolves embedded font names as well as image operators.
                        // The same list is reused by image extraction below.
                        operatorList = await page.getOperatorList();
                    } catch (operatorError) {
                        console.warn(`[KoboForge] PDF operators page ${pageNumber}`, operatorError);
                    }
                    const fontMetadata = collectPdfFontMetadata(page, textContent);
                    Object.values(fontMetadata).forEach((font) => {
                        if (font?.sourceName) detectedFontFamilies.add(font.sourceName);
                    });
                    const viewport = page.getViewport({ scale: 1 });
                    const tableGeometry = detectPdfTableGeometry(operatorList);
                    const pageBlocks = extractPdfBlocks(textContent.items || [], {
                        preserveTables: preserveTablesEnabled(),
                        fontMetadata,
                        pageWidth: viewport.width,
                        pageHeight: viewport.height,
                        tableGeometry
                    });
                    pageLayout = pageBlocks.pageLayout || pageLayout;
                    if (pageLayout.readingColumns > 1) readingColumnPageCount += 1;
                    let pageImages = [];
                    try {
                        pageImages = await extractPdfPageImages(page, operatorList);
                    } catch (imageError) {
                        console.warn(`[KoboForge] PDF image extraction page ${pageNumber}`, imageError);
                    }

                    if (!pageBlocks.length) {
                        const definitelyBlank = !!(
                            operatorList
                            && Array.isArray(operatorList.fnArray)
                            && operatorList.fnArray.length === 0
                        );
                        if (!pageImages.length && !definitelyBlank) {
                            const renderedPage = await renderPdfPageAsImage(page);
                            if (renderedPage) pageImages = [renderedPage];
                        }
                        if (pageImages.length) {
                            imageOnlyPages.push(pageNumber);
                            sourcePageKind = ' kf-pdf-image-page';
                        } else {
                            emptyPages.push(pageNumber);
                            sourcePageKind = ' kf-pdf-blank-page';
                        }
                    } else {
                        for (const block of pageBlocks) {
                            if (
                                block.type === 'spacer'
                                && pageImages.length
                                && pageLayout.sideRail === block.sourceColumn
                            ) {
                                // This blank area is occupied by an extracted
                                // image rail in the source PDF, not note space.
                                continue;
                            }
                            const sourceColumn = ['left', 'right'].includes(block.sourceColumn)
                                ? block.sourceColumn
                                : '';
                            const columnAttribute = sourceColumn
                                ? ` data-pdf-column="${sourceColumn}"`
                                : '';
                            const alignment = ['left', 'center', 'right'].includes(block.alignment)
                                ? block.alignment
                                : 'left';
                            const vertical = ['top', 'middle', 'bottom'].includes(block.verticalPosition)
                                ? block.verticalPosition
                                : 'top';
                            if (block.type === 'table') {
                                tableCount += 1;
                                pageParts.push(
                                    block.html.replace(
                                        'class="kobo-table"',
                                        `class="kobo-table kf-pdf-block kf-align-${alignment}" data-pdf-vpos="${vertical}"${columnAttribute}`
                                    )
                                );
                            } else if (block.type === 'spacer') {
                                noteSpaceCount += 1;
                                pageParts.push(block.html);
                            } else if (block.type === 'heading') {
                                headingCount += 1;
                                const tag = block.level === 1 ? 'h1' : 'h2';
                                pageParts.push(
                                    `<${tag} class="kf-pdf-block kf-align-${alignment}" data-pdf-vpos="${vertical}"${columnAttribute}>${block.html || escapeHtml(block.text)}</${tag}>`
                                );
                            } else {
                                pageParts.push(
                                    `<p class="preserve-structure kf-pdf-block kf-align-${alignment}" data-pdf-vpos="${vertical}"${columnAttribute}>${block.html || escapeHtml(block.text)}</p>`
                                );
                            }
                        }
                    }
                    pageDesignSignal = summarizePdfPageDesign({
                        textContent,
                        operatorList,
                        pageBlocks,
                        pageImages,
                        tableGeometry,
                        viewport
                    });
                    const imageLayout = ['left', 'right'].includes(pageLayout.sideRail)
                        ? `inline-${pageLayout.sideRail}`
                        : 'block';
                    const fitHeightPercent = Math.max(
                        20,
                        Math.min(
                            92,
                            pageLayout.sideRail
                                ? 82
                                : Math.round((Number(pageLayout.remainingRatio) || 0.72) * 100)
                        )
                    );
                    const imageParts = pageImages.map((source, imageIndex) => {
                        detectedImageCount += 1;
                        return (
                            `<figure class="kf-document-image kf-image-${imageLayout}">`
                            + `<img src="${source}" alt="PDF page ${pageNumber} image ${imageIndex + 1}" `
                            + `data-kf-layout="${imageLayout}" data-kf-layout-mode="auto" `
                            + `data-kf-width-mode="auto" data-kf-fit-height="${fitHeightPercent}" `
                            + `data-kf-page-images="${Math.max(1, pageImages.length)}"></figure>`
                        );
                    });
                    if (pageLayout.sideRail) pageParts.unshift(...imageParts);
                    else pageParts.push(...imageParts);
                } catch (pageErr) {
                    // Isolate per-page failures so page 2+ never aborts the whole convert
                    console.error(`[KoboForge] PDF page ${pageNumber}`, pageErr);
                    failedPages.push(pageNumber);
                    emptyPages.push(pageNumber);
                    pageParts.push(
                        `<p class="preserve-structure"><em>(Failed to extract page ${pageNumber}: ${escapeHtml(pageErr?.message || 'unknown error')})</em></p>`
                    );
                }
                pageDesignSignals.push(pageDesignSignal);
                const startZone = ['top', 'middle', 'bottom'].includes(pageLayout.startZone)
                    ? pageLayout.startZone
                    : 'top';
                const offsetLevel = Math.max(0, Math.min(8, Math.round(pageLayout.offsetLevel || 0)));
                const topPercent = Math.max(
                    0,
                    Math.min(100, Math.round((Number(pageLayout.topRatio) || 0) * 100))
                );
                parts.push(
                    `<div class="kf-page-break" data-page="${pageNumber}"></div>`
                    + `<section class="kf-pdf-page kf-page-v-${startZone} kf-page-offset-${offsetLevel}${sourcePageKind}" data-source-page="${pageNumber}" data-pdf-top="${topPercent}">`
                    + `${pageParts.join('')}</section>`
                );
                setProgress(12 + (pageNumber / total) * 70, `PDF page ${pageNumber}/${total}`);
                // Yield so progress UI paints between pages (avoids "stuck on page 1")
                await new Promise((r) => setTimeout(r, 0));
            }

            const html = parts.length
                ? parts.join('')
                : '<p class="preserve-structure">No extractable text found.</p>';
            setProgress(84, 'Optimizing PDF images');
            const optimized = await optimizeDocumentImages(html);

            try {
                pdf.destroy?.();
            } catch (_) { /* ignore */ }

            const paragraphCount = (optimized.html.match(/<p\b/gi) || []).length || 1;
            const fixedLayoutRecommendation = analyzePdfLayoutComplexity(pageDesignSignals);
            const structureParts = [];
            if (tableCount) structureParts.push(`${tableCount} table${tableCount === 1 ? '' : 's'}`);
            if (noteSpaceCount) {
                structureParts.push(`${noteSpaceCount} intentional blank region${noteSpaceCount === 1 ? '' : 's'}`);
            }
            if (detectedFontFamilies.size) {
                structureParts.push(`${detectedFontFamilies.size} PDF font profile${detectedFontFamilies.size === 1 ? '' : 's'}`);
            }
            if (readingColumnPageCount) {
                structureParts.push(
                    `${readingColumnPageCount} page-level reading column layout${readingColumnPageCount === 1 ? '' : 's'}`
                );
            }
            structureParts.push('line/indent reconstruction');
            if (optimized.imageCount) {
                structureParts.push(`${optimized.imageCount} Kobo-optimized image${optimized.imageCount === 1 ? '' : 's'}`);
            }

            const structureNote = structureParts.join(' + ');

            if (emptyPages.length === total) {
                warnings.push('No recoverable text or page image was found in this PDF.');
            }
            if (failedPages.length) {
                warnings.push(
                    `PDF.js failed on page(s) ${failedPages.join(', ')} (continued with remaining pages). Try re-exporting the PDF or use DOCX.`
                );
            }
            if (optimized.failed > 0) {
                warnings.push(`Could not optimize ${optimized.failed} detected PDF image(s).`);
            }

            const target = documentImageTarget();
            const imageStatus = optimized.imageCount
                ? ` ${optimized.imageCount} detected image${optimized.imageCount === 1 ? '' : 's'} automatically optimized for the selected Kobo and kept inline.`
                : '';
            const layoutStatus = [
                noteSpaceCount
                    ? `${noteSpaceCount} intentional blank region${noteSpaceCount === 1 ? '' : 's'} retained for writing`
                    : '',
                detectedFontFamilies.size
                    ? `${detectedFontFamilies.size} source font profile${detectedFontFamilies.size === 1 ? '' : 's'} mapped to Kobo-safe size, family, weight, and style`
                    : '',
                readingColumnPageCount
                    ? `${readingColumnPageCount} page-level multi-column layout${readingColumnPageCount === 1 ? '' : 's'} separated into readable Kobo flow`
                    : ''
            ].filter(Boolean).join('; ');
            return {
                title: file.name.replace(/\.[^.]+$/, ''),
                author: '',
                bodyHtml: optimized.html,
                paragraphCount,
                formatLabel: 'PDF',
                structureNote,
                status: tableCount
                    ? `PDF parsed locally (${total} page${total === 1 ? '' : 's'}). Detected ${tableCount} table${tableCount === 1 ? '' : 's'}; reconstructed paragraphs and indentation${headingCount ? `, with ${headingCount} heading guess(es)` : ''}${layoutStatus ? `; ${layoutStatus}` : ''}.${imageStatus}`
                    : `PDF parsed locally (${total} page${total === 1 ? '' : 's'}). Reconstructed paragraph boundaries and indentation from page coordinates${headingCount ? `; ${headingCount} heading guess(es)` : ''}${layoutStatus ? `; ${layoutStatus}` : ''}.${imageStatus}`,
                warnings,
                emptyPages,
                imageOnlyPages,
                imageSources: optimized.imageSources,
                imageVariants: optimized.imageVariants,
                imageCount: optimized.imageCount,
                imageTarget: `${target.profile.name} · ${target.orientation}`,
                detectedImageCount,
                noteSpaceCount,
                detectedFontCount: detectedFontFamilies.size,
                readingColumnPageCount,
                pageCount: total,
                fixedLayoutRecommendation
            };
        }

        /**
         * Normalize PDF.js text items and group into visual lines (top→bottom).
         */
        function pdfSizeClass(fontSize, baselineSize) {
            const ratio = Math.max(0.1, Number(fontSize) / Math.max(Number(baselineSize), 1));
            if (ratio < 0.78) return 'kf-size-75';
            if (ratio < 0.92) return 'kf-size-88';
            if (ratio < 1.09) return 'kf-size-100';
            if (ratio < 1.21) return 'kf-size-112';
            if (ratio < 1.39) return 'kf-size-125';
            if (ratio < 1.64) return 'kf-size-150';
            return 'kf-size-175';
        }

        function appendPdfRun(runs, text, style) {
            if (!text) return;
            const signature = [
                style.family,
                style.sizeClass,
                style.bold ? 'b' : '',
                style.italic ? 'i' : '',
                style.light ? 'l' : '',
                style.gapLevel || 0
            ].join('|');
            const previous = runs[runs.length - 1];
            if (previous && previous.signature === signature) {
                previous.text += text;
                return;
            }
            runs.push({ text, ...style, signature });
        }

        function renderPdfRunsHtml(runs) {
            return (runs || []).map((run, index, allRuns) => {
                const classes = [
                    'kf-pdf-run',
                    `kf-font-${run.family || 'serif'}`,
                    run.sizeClass || 'kf-size-100'
                ];
                if (run.light) classes.push('kf-weight-light');
                if (run.gapLevel) classes.push(`kf-gap-before-${run.gapLevel}`);
                const previousText = (allRuns[index - 1]?.text || '').trimEnd();
                const currentText = (run.text || '').trimStart();
                const fieldBoundary = /[:;]$/.test(previousText)
                    && (
                        /^[A-Z][a-z]/.test(currentText)
                        || /^\d{1,2}(?:am|pm)\b/i.test(currentText)
                    );
                let content = escapeHtml(normalizePdfTokenSpacing(
                    `${run.gapLevel || fieldBoundary ? ' ' : ''}${run.text || ''}`
                ));
                if (run.italic) content = `<em>${content}</em>`;
                if (run.bold) content = `<strong>${content}</strong>`;
                return `<span class="${classes.join(' ')}">${content}</span>`;
            }).join('');
        }

        function renderPdfLineHtml(line, { preserveIndent = true } = {}) {
            const indent = preserveIndent ? Math.max(0, Math.min(3, line.indentLevel || 0)) : 0;
            const content = renderPdfRunsHtml(line.pdfRuns)
                || escapeHtml(line.plainText || line.rawText || '');
            if (!preserveIndent) return content;
            return `<span class="kf-pdf-line kf-indent-${indent}">${content}</span>`;
        }

        function normalizePdfTokenSpacing(text) {
            return String(text || '')
                .replace(/([:;])(?=[A-Z][a-z])/g, '$1 ')
                .replace(/:(?=\d{1,2}(?:am|pm)\b)/gi, ': ')
                .replace(/(\d(?:st|nd|rd|th))(?=[A-Z][a-z])/g, '$1 ');
        }

        function buildPdfLines(items, { fontMetadata = {} } = {}) {
            const normalized = (items || [])
                .filter((item) => item && item.str && String(item.str).trim() !== '')
                .map((item) => {
                    // Some PDF.js items lack transform (marked content / odd fonts).
                    // Skipping them used to throw mid-document after page 1.
                    const tr = item.transform;
                    if (!tr || tr.length < 6) return null;
                    const text = normalizePdfTokenSpacing(
                        stripInvalidXmlChars(String(item.str))
                    );
                    if (!text.trim()) return null;
                    const chars = Math.max(text.length, 1);
                    const width = Number(item.width) || 0;
                    const avgCharWidth = Math.max(width / chars, 2);
                    const height = Number(item.height) || Math.abs(tr[3]) || Math.abs(tr[0]) || 10;
                    const font = fontMetadata[item.fontName]
                        || describePdfFont(item.fontName || '', '');
                    return {
                        text,
                        x: Number(tr[4]) || 0,
                        y: Number(tr[5]) || 0,
                        width,
                        height: height || 10,
                        avgCharWidth,
                        font
                    };
                })
                .filter(Boolean)
                .sort((a, b) => {
                    if (Math.abs(a.y - b.y) > 2) return b.y - a.y;
                    return a.x - b.x;
                });

            const lines = [];
            for (const item of normalized) {
                const currentLine = lines[lines.length - 1];
                if (!currentLine || Math.abs(currentLine.y - item.y) > Math.max(2.5, item.height * 0.45)) {
                    lines.push({
                        y: item.y,
                        xStart: item.x,
                        avgCharWidth: item.avgCharWidth,
                        maxHeight: item.height,
                        items: [item]
                    });
                } else {
                    currentLine.items.push(item);
                    currentLine.xStart = Math.min(currentLine.xStart, item.x);
                    currentLine.avgCharWidth = Math.min(currentLine.avgCharWidth, item.avgCharWidth);
                    currentLine.maxHeight = Math.max(currentLine.maxHeight || 0, item.height);
                }
            }

            const minX = lines.reduce((value, line) => Math.min(value, line.xStart), Number.POSITIVE_INFINITY);
            const heights = lines.map((l) => l.maxHeight || 10);
            const medianHeight = median(heights) || 10;

            return lines.map((line) => {
                const sorted = line.items.sort((a, b) => a.x - b.x);
                let text = '';
                const pdfRuns = [];
                let previousEnd = null;
                let avgSpace = line.avgCharWidth || 4;
                for (const part of sorted) {
                    let prefix = '';
                    let gapLevel = 0;
                    if (previousEnd !== null) {
                        const gap = part.x - previousEnd;
                        if (gap > avgSpace * 0.55) {
                            const gapUnits = Math.max(1, Math.min(12, Math.round(gap / avgSpace)));
                            prefix = ' '.repeat(gapUnits);
                            if (gapUnits >= 9) gapLevel = 3;
                            else if (gapUnits >= 7) gapLevel = 2;
                            else if (gapUnits >= 5) gapLevel = 1;
                        }
                    }
                    const chunk = `${prefix}${part.text}`;
                    text += chunk;
                    appendPdfRun(pdfRuns, gapLevel ? part.text : chunk, {
                        family: part.font?.family || 'sans',
                        sizeClass: pdfSizeClass(part.height, medianHeight),
                        bold: !!part.font?.bold,
                        italic: !!part.font?.italic,
                        light: !!part.font?.light,
                        gapLevel
                    });
                    previousEnd = part.x + part.width;
                    avgSpace = (avgSpace + part.avgCharWidth) / 2;
                }
                const indentSpaces = Math.max(0, Math.round((line.xStart - minX) / Math.max(avgSpace, 4)));
                const lineHeight = Math.max(...sorted.map((part) => part.height || 10), 10);
                const fontWeights = new Map();
                sorted.forEach((part) => {
                    const key = part.font?.family || 'sans';
                    fontWeights.set(key, (fontWeights.get(key) || 0) + part.text.length);
                });
                const dominantFontFamily = [...fontWeights.entries()]
                    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'sans';
                return {
                    y: line.y,
                    xStart: line.xStart,
                    xEnd: sorted.reduce(
                        (maximum, part) => Math.max(maximum, part.x + part.width),
                        line.xStart
                    ),
                    rawText: `${' '.repeat(Math.min(indentSpaces, 12))}${text.trimEnd()}`,
                    plainText: text.trim(),
                    indentSpaces,
                    lineHeight,
                    maxHeight: line.maxHeight || lineHeight,
                    medianHeight,
                    avgCharWidth: avgSpace,
                    indentLevel: indentSpaces >= 9 ? 3 : indentSpaces >= 5 ? 2 : indentSpaces >= 2 ? 1 : 0,
                    pdfRuns,
                    dominantFontFamily,
                    hasBold: pdfRuns.some((run) => run.bold && (run.text || '').trim()),
                    hasItalic: pdfRuns.some((run) => run.italic && (run.text || '').trim()),
                    cells: sorted.map((part) => ({
                        text: part.text,
                        x: part.x,
                        width: part.width,
                        end: part.x + part.width
                    }))
                };
            });
        }

        function pdfVerticalZone(topRatio) {
            if (topRatio < 0.28) return 'top';
            if (topRatio < 0.64) return 'middle';
            return 'bottom';
        }

        function detectPdfPageLayout(lines, { pageHeight = 0 } = {}) {
            const first = lines?.[0];
            const height = Math.max(Number(pageHeight) || 0, 1);
            if (!first) {
                return {
                    startZone: 'top',
                    offsetLevel: 0,
                    topRatio: 0,
                    remainingRatio: 0.92
                };
            }
            const firstTop = height - (
                Number(first.y || 0) + Number(first.maxHeight || first.lineHeight || 0)
            );
            const topRatio = Math.max(0, Math.min(0.8, firstTop / height));
            const bottomClear = Math.min(...lines.map((line) => (
                Number(line.y || 0)
                - (Number(line.maxHeight || line.lineHeight || 0) * 0.35)
            )));
            const remainingRatio = Math.max(
                0.2,
                Math.min(0.92, (bottomClear / height) - 0.025)
            );
            return {
                startZone: pdfVerticalZone(topRatio),
                // Eight export-safe classes retain the page's top whitespace
                // without introducing fixed-position text that cannot reflow.
                offsetLevel: Math.max(0, Math.min(8, Math.round(topRatio * 16))),
                topRatio,
                remainingRatio
            };
        }

        function detectPdfBlockPosition(sourceLines, {
            pageWidth = 0,
            pageHeight = 0
        } = {}) {
            const lines = (sourceLines || []).filter(Boolean);
            const width = Math.max(Number(pageWidth) || 0, 1);
            const height = Math.max(Number(pageHeight) || 0, 1);
            if (!lines.length) {
                return { alignment: 'left', verticalPosition: 'top' };
            }
            const left = Math.min(...lines.map((line) => Number(line.xStart) || 0));
            const rightEdge = Math.max(...lines.map((line) => Number(line.xEnd) || left));
            const leftRatio = Math.max(0, left / width);
            const rightRatio = Math.max(0, (width - rightEdge) / width);
            const occupiedRatio = Math.max(0, Math.min(1, (rightEdge - left) / width));
            let alignment = 'left';
            if (occupiedRatio < 0.86 && Math.abs(leftRatio - rightRatio) <= 0.075) {
                alignment = 'center';
            } else if (lines.length >= 2) {
                const startValues = lines.map((line) => Number(line.xStart) || 0);
                const endValues = lines.map((line) => Number(line.xEnd) || 0);
                const startSpread = Math.max(...startValues) - Math.min(...startValues);
                const endSpread = Math.max(...endValues) - Math.min(...endValues);
                if (endSpread <= width * 0.025 && startSpread > width * 0.04) {
                    alignment = 'right';
                } else if (startSpread <= width * 0.025) {
                    alignment = 'left';
                } else if (leftRatio > 0.24 && leftRatio - rightRatio >= 0.12) {
                    alignment = 'right';
                }
            } else if (leftRatio > 0.24 && leftRatio - rightRatio >= 0.12) {
                alignment = 'right';
            }
            const blockTop = Math.min(...lines.map((line) => (
                height - (
                    Number(line.y || 0)
                    + Number(line.maxHeight || line.lineHeight || 0)
                )
            )));
            return {
                alignment,
                verticalPosition: pdfVerticalZone(Math.max(0, blockTop / height))
            };
        }

        function clusterPdfBaselines(items) {
            const baselines = [];
            (items || []).forEach((item) => {
                const y = Number(item?.transform?.[5]);
                if (!Number.isFinite(y)) return;
                const existing = baselines.findIndex((value) => Math.abs(value - y) <= 3);
                if (existing < 0) baselines.push(y);
            });
            return baselines;
        }

        /**
         * Detect page-level newspaper/brochure columns before visual line
         * reconstruction. Splitting on item start coordinates prevents unrelated
         * left- and right-column text at the same height from being interleaved.
         * Short local two-column runs are left to the table detector instead.
         */
        function detectPdfReadingColumns(items, {
            pageWidth = 0,
            pageHeight = 0
        } = {}) {
            const width = Number(pageWidth) || 0;
            const height = Math.max(Number(pageHeight) || 0, 1);
            const eligible = (items || []).filter((item) => (
                item?.str
                && String(item.str).trim()
                && item.transform?.length >= 6
                && Number.isFinite(Number(item.transform[4]))
            ));
            if (width <= 0 || eligible.length < 14) return null;

            const starts = eligible
                .map((item) => Number(item.transform[4]))
                .sort((a, b) => a - b);
            const startClusters = [];
            starts.forEach((value) => {
                const previous = startClusters[startClusters.length - 1];
                if (!previous || value - previous[previous.length - 1] > 8) {
                    startClusters.push([value]);
                } else {
                    previous.push(value);
                }
            });
            const centers = startClusters.map((cluster) => median(cluster));
            let best = null;
            for (let index = 0; index < centers.length - 1; index += 1) {
                const low = centers[index];
                const high = centers[index + 1];
                const gap = high - low;
                const split = (low + high) / 2;
                if (gap < Math.max(width * 0.055, 28)) continue;
                if (split < width * 0.18 || split > width * 0.72) continue;

                const leftItems = eligible.filter((item) => Number(item.transform[4]) < split);
                const rightItems = eligible.filter((item) => Number(item.transform[4]) >= split);
                const leftLines = clusterPdfBaselines(leftItems);
                const rightLines = clusterPdfBaselines(rightItems);
                if (leftLines.length < 7 || rightLines.length < 7) continue;
                const span = (lines) => (
                    lines.length
                        ? (Math.max(...lines) - Math.min(...lines)) / height
                        : 0
                );
                const leftSpan = span(leftLines);
                const rightSpan = span(rightLines);
                if (leftSpan < 0.38 || rightSpan < 0.38) continue;
                const lineBalance = Math.min(leftLines.length, rightLines.length)
                    / Math.max(leftLines.length, rightLines.length);
                if (lineBalance < 0.22) continue;

                const score = gap
                    + Math.min(leftLines.length, rightLines.length) * 4
                    + Math.min(leftSpan, rightSpan) * 40;
                if (!best || score > best.score) {
                    best = {
                        split,
                        gap,
                        score,
                        leftItems,
                        rightItems,
                        leftLineCount: leftLines.length,
                        rightLineCount: rightLines.length
                    };
                }
            }
            return best;
        }

        function median(arr) {
            if (!arr.length) return 0;
            const s = [...arr].sort((a, b) => a - b);
            const mid = Math.floor(s.length / 2);
            return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
        }

        /**
         * Look for an actual ruled grid in the PDF drawing operators. Text that
         * merely lines up in columns is commonly a definition list or worksheet,
         * so alignment alone must not create a table.
         */
        function detectPdfTableGeometry(operatorList) {
            const ops = pdfjsLib.OPS || {};
            if (!operatorList || !Number.isFinite(ops.constructPath)) {
                return { hasGrid: false, horizontalRules: 0, verticalRules: 0 };
            }
            const paintStrokeOps = new Set([
                ops.stroke,
                ops.closeStroke,
                ops.fillStroke,
                ops.eoFillStroke,
                ops.closeFillStroke,
                ops.closeEOFillStroke
            ].filter(Number.isFinite));
            const horizontalRules = [];
            const verticalRules = [];
            const strokedRectangles = [];

            operatorList.fnArray.forEach((fn, index) => {
                if (fn !== ops.constructPath) return;
                const args = operatorList.argsArray[index] || [];
                const pathOps = Array.isArray(args[0]) ? args[0] : [];
                const coordinates = Array.isArray(args[1]) ? args[1] : [];
                const bbox = Array.isArray(args[2]) ? args[2] : [];
                let width = 0;
                let height = 0;
                const isRectangle = pathOps.length === 1
                    && pathOps[0] === ops.rectangle
                    && coordinates.length >= 4;
                if (isRectangle) {
                    width = Math.abs(Number(coordinates[2]) || 0);
                    height = Math.abs(Number(coordinates[3]) || 0);
                } else if (bbox.length >= 4) {
                    width = Math.abs((Number(bbox[2]) || 0) - (Number(bbox[0]) || 0));
                    height = Math.abs((Number(bbox[3]) || 0) - (Number(bbox[1]) || 0));
                }
                if (width >= 24 && height <= Math.max(3, width * 0.012)) {
                    horizontalRules.push({ width, height });
                }
                if (height >= 24 && width <= Math.max(3, height * 0.012)) {
                    verticalRules.push({ width, height });
                }
                if (
                    isRectangle
                    && width >= 12
                    && height >= 8
                    && paintStrokeOps.has(operatorList.fnArray[index + 1])
                ) {
                    strokedRectangles.push({ width, height });
                }
            });

            const repeatedCells = strokedRectangles.length >= 4
                && (() => {
                    const typicalWidth = median(strokedRectangles.map((rect) => rect.width));
                    const typicalHeight = median(strokedRectangles.map((rect) => rect.height));
                    return strokedRectangles.filter((rect) => (
                        Math.abs(rect.width - typicalWidth) <= Math.max(2, typicalWidth * 0.22)
                        && Math.abs(rect.height - typicalHeight) <= Math.max(2, typicalHeight * 0.22)
                    )).length >= 4;
                })();
            return {
                hasGrid: (
                    horizontalRules.length >= 2
                    && verticalRules.length >= 2
                ) || repeatedCells,
                horizontalRules: horizontalRules.length,
                verticalRules: verticalRules.length
            };
        }

        function clusterColumnXs(xs, tolerance) {
            if (!xs.length) return [];
            const sorted = [...xs].sort((a, b) => a - b);
            const clusters = [[sorted[0]]];
            for (let i = 1; i < sorted.length; i += 1) {
                const last = clusters[clusters.length - 1];
                const center = last.reduce((s, v) => s + v, 0) / last.length;
                if (Math.abs(sorted[i] - center) <= tolerance) {
                    last.push(sorted[i]);
                } else {
                    clusters.push([sorted[i]]);
                }
            }
            return clusters.map((c) => c.reduce((s, v) => s + v, 0) / c.length);
        }

        function lineToRow(line, colCenters, colTolerance) {
            const row = colCenters.map(() => '');
            for (const cell of line.cells) {
                let bestIdx = 0;
                let bestDist = Infinity;
                for (let i = 0; i < colCenters.length; i += 1) {
                    const dist = Math.abs(cell.x - colCenters[i]);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestIdx = i;
                    }
                }
                if (bestDist > colTolerance * 2.5) continue;
                row[bestIdx] = row[bestIdx] ? `${row[bestIdx]} ${cell.text}`.trim() : cell.text.trim();
            }
            return row;
        }

        function lineLooksTabular(line) {
            // A single two-part line is commonly a verse number plus prose, so the
            // base signal stays conservative. Stable two-column runs are detected
            // separately across neighbouring lines.
            if (!line.cells || line.cells.length < 3) return false;
            let bigGaps = 0;
            for (let i = 1; i < line.cells.length; i += 1) {
                const gap = line.cells[i].x - line.cells[i - 1].end;
                if (gap > Math.max(line.avgCharWidth * 3.5, 18)) bigGaps += 1;
            }
            return bigGaps >= 2;
        }

        function splitPdfLineIntoColumns(line) {
            const cells = [...(line?.cells || [])].sort((a, b) => a.x - b.x);
            if (!cells.length) return [];
            const threshold = Math.max((line.avgCharWidth || 4) * 4, 20);
            const columns = [];
            cells.forEach((cell) => {
                const previous = columns[columns.length - 1];
                if (!previous || cell.x - previous.end > threshold) {
                    columns.push({
                        x: cell.x,
                        end: cell.end,
                        text: (cell.text || '').trim()
                    });
                    return;
                }
                previous.text = `${previous.text} ${cell.text || ''}`.replace(/\s+/g, ' ').trim();
                previous.end = Math.max(previous.end, cell.end);
            });
            return columns.filter((column) => column.text);
        }

        function lineLooksLikeTwoColumnRow(line) {
            const columns = splitPdfLineIntoColumns(line);
            if (columns.length !== 2) return false;
            const first = columns[0].text.trim();
            const second = columns[1].text.trim();
            if (!first || !second) return false;
            // Reject the common PDF pattern “12  prose...” while still allowing
            // labelled rows such as “2) Security     Number”.
            if (/^\(?\d{1,3}[\).:]?$/.test(first)) return false;
            if (/^[•●▪◦*-]$/.test(first)) return false;
            return true;
        }

        function stableTwoColumnLineIndexes(lines) {
            const stable = new Set();
            let index = 0;
            while (index < lines.length) {
                if (!lineLooksLikeTwoColumnRow(lines[index])) {
                    index += 1;
                    continue;
                }
                const run = [];
                let cursor = index;
                while (cursor < lines.length && lineLooksLikeTwoColumnRow(lines[cursor])) {
                    if (run.length) {
                        const previous = run[run.length - 1];
                        const gap = previous.y - lines[cursor].y;
                        if (gap > Math.max(previous.lineHeight * 2.4, 24)) break;
                    }
                    run.push(lines[cursor]);
                    cursor += 1;
                }
                if (run.length >= 3) {
                    const secondStarts = run.map((line) => splitPdfLineIntoColumns(line)[1].x);
                    const center = median(secondStarts);
                    const tolerance = Math.max(
                        median(run.map((line) => line.avgCharWidth || 4)) * 3,
                        20
                    );
                    const matching = run.filter((line) => (
                        Math.abs(splitPdfLineIntoColumns(line)[1].x - center) <= tolerance
                    ));
                    if (matching.length === run.length) {
                        run.forEach((line) => stable.add(lines.indexOf(line)));
                    }
                }
                index = Math.max(cursor, index + 1);
            }
            return stable;
        }

        /**
         * Heading heuristic (conservative): false H2s used to split the EPUB spine
         * mid-document (e.g. “Offerings at the Tabernacle's Consecration”), so Kobo
         * looked stuck after that title while the rest lived in later spine items.
         */
        function lineLooksLikeHeading(line) {
            const t = (line.plainText || '').trim();
            if (!t || t.length > 80 || t.length < 3) return false;
            if (t.endsWith('.') && t.length > 30) return false;
            if (lineLooksTabular(line)) return false;
            // Long prose / verses starting with a number are not outline headings
            if (/^\d+\s+[“"A-Za-z]/.test(t) && t.length > 45) return false;
            // Bare bible refs stay body text unless massively oversized
            if (/^(numbers|genesis|exodus|leviticus|deuteronomy|matthew|mark|luke|john)\b/i.test(t)
                && t.length < 40
                && !/^\d+\./.test(t)) {
                const r0 = (line.maxHeight || line.lineHeight) / (line.medianHeight || 10);
                if (r0 < 1.5) return false;
            }
            const ratio = (line.maxHeight || line.lineHeight) / (line.medianHeight || 10);
            const isBold = !!line.hasBold;
            const isChapter = /^(chapter|part|section|appendix)\b/i.test(t);
            // Outline only: "1. God goes with his people" — not "1 On the day when Moses"
            const isNumberedOutline = /^\d{1,2}[\.\)]\s+\S/.test(t) && t.length <= 70 && !/^\d+\s+[A-Z]/.test(t);
            const isLetteredSection = /^[A-Z][\.\)]\s+\S/.test(t) && t.length <= 70;
            const isAllCaps = t.length <= 50
                && t === t.toUpperCase()
                && /[A-Z]/.test(t)
                && t.split(/\s+/).length <= 10;
            if (isChapter || (isAllCaps && ratio >= 1.4)) return { level: 1 };
            if ((isNumberedOutline && (ratio >= 1.15 || isBold)) || (isLetteredSection && isBold)) {
                return { level: 2 };
            }
            if (isAllCaps && ratio >= 1.22) return { level: 2 };
            if (isBold && ratio >= 1.25) return { level: 2 };
            // Size-only promotion needs a strong signal (avoids section subtitles)
            if (ratio >= 1.55) return { level: 2 };
            return null;
        }

        function buildTableHtml(rows, { headerRow = true } = {}) {
            if (!rows.length) return '';
            const colCount = Math.max(...rows.map((r) => r.length));
            const normalized = rows.map((r) => {
                const copy = r.slice();
                while (copy.length < colCount) copy.push('');
                return copy;
            });
            const usedCols = [];
            for (let c = 0; c < colCount; c += 1) {
                if (normalized.some((r) => (r[c] || '').trim())) usedCols.push(c);
            }
            if (usedCols.length < 2) return '';

            const slim = normalized.map((r) => usedCols.map((c) => (r[c] || '').trim()));
            const nonEmptyRows = slim.filter((r) => r.some((cell) => cell));
            if (nonEmptyRows.length < 2) return '';

            let html = '<table class="kobo-table">';
            nonEmptyRows.forEach((row, idx) => {
                const tag = headerRow && idx === 0 ? 'th' : 'td';
                html += '<tr>';
                row.forEach((cell) => {
                    html += `<${tag}>${escapeHtml(cell || ' ')}</${tag}>`;
                });
                html += '</tr>';
            });
            html += '</table>';
            return html;
        }

        function hasPdfTableHeaderEvidence(lines, columnGroups) {
            if (lines.length < 3 || !lines[0]?.hasBold) return false;
            const columnCount = columnGroups[0]?.length || 0;
            if (columnCount < 2 || columnCount > 6) return false;
            if (!columnGroups.every((groups) => groups.length === columnCount)) return false;
            const headers = columnGroups[0].map((group) => (group.text || '').trim());
            if (
                headers.some((header) => (
                    !header
                    || header.length > 48
                    || /^\(?\d{1,3}[\).:]?\b/.test(header)
                    || /[.!?]\s*$/.test(header)
                ))
            ) {
                return false;
            }
            const bodyLines = lines.slice(1);
            const nonBoldBody = bodyLines.filter((line) => !line.hasBold).length;
            if (nonBoldBody < Math.ceil(bodyLines.length * 0.6)) return false;
            const tolerance = Math.max(
                median(lines.map((line) => line.avgCharWidth || 4)) * 3,
                16
            );
            for (let column = 0; column < columnCount; column += 1) {
                const starts = columnGroups.map((groups) => groups[column].x);
                const center = median(starts);
                if (starts.some((start) => Math.abs(start - center) > tolerance)) return false;
            }
            return true;
        }

        function tryBuildTableFromLines(lines, tableGeometry = {}) {
            if (lines.length < 2) return null;
            const columnGroups = lines.map(splitPdfLineIntoColumns);
            const semanticHeader = hasPdfTableHeaderEvidence(lines, columnGroups);
            if (!tableGeometry.hasGrid && !semanticHeader) return null;

            if (
                lines.length >= 3
                && columnGroups.every((groups) => groups.length === 2)
            ) {
                const secondStarts = columnGroups.map((groups) => groups[1].x);
                const center = median(secondStarts);
                const tolerance = Math.max(
                    median(lines.map((line) => line.avgCharWidth || 4)) * 3,
                    20
                );
                if (secondStarts.every((start) => Math.abs(start - center) <= tolerance)) {
                    const rows = columnGroups.map((groups) => groups.map((group) => group.text));
                    const tableHtml = buildTableHtml(rows, {
                        headerRow: semanticHeader
                    });
                    if (tableHtml) return tableHtml;
                }
            }
            const tabularCount = lines.filter(lineLooksTabular).length;
            if (tabularCount < 2) return null;
            if (tabularCount < Math.ceil(lines.length * 0.5)) return null;

            const allXs = [];
            let avgChar = 4;
            for (const line of lines) {
                avgChar = (avgChar + (line.avgCharWidth || 4)) / 2;
                for (const cell of line.cells) allXs.push(cell.x);
            }
            const colTolerance = Math.max(avgChar * 1.8, 8);
            const colCenters = clusterColumnXs(allXs, colTolerance);
            if (colCenters.length < 2) return null;

            const rows = lines.map((line) => lineToRow(line, colCenters, colTolerance));
            const tableHtml = buildTableHtml(rows, { headerRow: semanticHeader });
            return tableHtml || null;
        }

        function detectPdfWhitespace(builtLines, { pageHeight = 0 } = {}) {
            if (!builtLines || builtLines.length < 2) {
                return { typicalAdvance: 0, spaces: [] };
            }
            const medianHeight = median(
                builtLines.map((line) => line.maxHeight || line.lineHeight || 10)
            ) || 10;
            const gaps = [];
            for (let index = 0; index < builtLines.length - 1; index += 1) {
                const gap = builtLines[index].y - builtLines[index + 1].y;
                if (Number.isFinite(gap) && gap > medianHeight * 0.55) {
                    gaps.push({ index, gap });
                }
            }
            if (!gaps.length) return { typicalAdvance: medianHeight * 1.5, spaces: [] };

            // Estimate ordinary baseline advance without letting genuine blank
            // worksheet areas skew it upward. This works for sparse title pages
            // as well as dense handouts.
            const ordinaryLimit = Math.max(
                medianHeight * 2.6,
                Number(pageHeight || 0) * 0.045
            );
            const ordinaryGaps = gaps
                .map((entry) => entry.gap)
                .filter((gap) => gap <= ordinaryLimit);
            const typicalAdvance = median(ordinaryGaps)
                || median(gaps.map((entry) => entry.gap))
                || medianHeight * 1.5;
            const significantGap = Math.max(
                typicalAdvance * 1.65,
                medianHeight * 2.75,
                Number(pageHeight || 0) * 0.045
            );
            const minimumSurplus = Math.max(
                medianHeight * 1.05,
                Number(pageHeight || 0) * 0.018
            );

            const spaces = gaps
                .filter((entry) => (
                    entry.gap >= significantGap
                    && entry.gap - typicalAdvance >= minimumSurplus
                ))
                .map((entry) => ({
                    ...entry,
                    lines: Math.max(
                        2,
                        Math.min(12, Math.round((entry.gap - typicalAdvance) / medianHeight))
                    )
                }));
            return { typicalAdvance, medianHeight, spaces };
        }

        function pdfSpacerHtml(space) {
            const lines = Math.max(2, Math.min(12, Math.round(Number(space?.lines) || 2)));
            return `<div class="kf-note-space kf-space-${lines}" data-space-lines="${lines}" contenteditable="false" role="separator" aria-label="Preserved blank writing space"></div>`;
        }

        function extractPdfSegmentBlocks(builtLines, preserveTables, tableGeometry) {
            if (!builtLines.length) return [];

            if (!preserveTables) {
                return linesToParagraphBlocks(builtLines);
            }

            const stableTwoColumn = stableTwoColumnLineIndexes(builtLines);
            const flags = builtLines.map((line, index) => (
                lineLooksTabular(line) || stableTwoColumn.has(index)
            ));
            const blocks = [];
            let proseBuf = [];
            const flushProse = () => {
                if (!proseBuf.length) return;
                linesToParagraphBlocks(proseBuf).forEach((b) => blocks.push(b));
                proseBuf = [];
            };

            let i = 0;
            while (i < builtLines.length) {
                if (!flags[i]) {
                    proseBuf.push(builtLines[i]);
                    i += 1;
                    continue;
                }

                let j = i;
                const region = [];
                while (j < builtLines.length) {
                    const line = builtLines[j];
                    if (region.length) {
                        const prev = region[region.length - 1];
                        const gap = prev.y - line.y;
                        if (gap > prev.lineHeight * 2.4) break;
                    }
                    if (flags[j]) {
                        region.push(line);
                        j += 1;
                        continue;
                    }
                    break;
                }

                if (region.length >= 2) {
                    const tableHtml = tryBuildTableFromLines(region, tableGeometry);
                    if (tableHtml) {
                        flushProse();
                        blocks.push({
                            type: 'table',
                            html: tableHtml,
                            sourceLines: region.slice()
                        });
                        i = j;
                        continue;
                    }
                }

                proseBuf.push(builtLines[i]);
                i += 1;
            }

            flushProse();
            return blocks;
        }

        function extractPdfBlocksFromLines(
            builtLines,
            preserveTables,
            pageHeight,
            tableGeometry
        ) {
            if (!builtLines.length) return [];
            const whitespace = detectPdfWhitespace(builtLines, { pageHeight });
            const spaceByLine = new Map(
                whitespace.spaces.map((space) => [space.index, space])
            );
            const textLeft = Math.min(
                ...builtLines.map((line) => Number(line.xStart) || 0).filter((value) => value > 0),
                Number(builtLines[0]?.xStart) || 0
            );
            const blocks = [];
            let segment = [];
            builtLines.forEach((line, index) => {
                segment.push(line);
                const space = spaceByLine.get(index);
                if (!space) return;
                promotePdfListBlocks(
                    extractPdfSegmentBlocks(segment, preserveTables, tableGeometry),
                    { textLeft }
                ).forEach((block) => blocks.push(block));
                blocks.push({
                    type: 'spacer',
                    lines: space.lines,
                    sourceY: line.y - (space.gap / 2),
                    html: pdfSpacerHtml(space)
                });
                segment = [];
            });
            promotePdfListBlocks(
                extractPdfSegmentBlocks(segment, preserveTables, tableGeometry),
                { textLeft }
            ).forEach((block) => blocks.push(block));
            return blocks;
        }

        function extractPdfBlocks(items, {
            preserveTables = true,
            fontMetadata = {},
            pageWidth = 0,
            pageHeight = 0,
            tableGeometry = { hasGrid: false }
        } = {}) {
            const builtLines = buildPdfLines(items, { fontMetadata });
            const blocks = [];
            blocks.pageLayout = detectPdfPageLayout(builtLines, { pageHeight });
            if (!builtLines.length) return blocks;

            const readingColumns = detectPdfReadingColumns(items, {
                pageWidth,
                pageHeight
            });
            if (readingColumns) {
                [
                    ['left', readingColumns.leftItems],
                    ['right', readingColumns.rightItems]
                ].forEach(([sourceColumn, columnItems]) => {
                    const columnLines = buildPdfLines(columnItems, { fontMetadata });
                    extractPdfBlocksFromLines(
                        columnLines,
                        preserveTables,
                        pageHeight,
                        tableGeometry
                    )
                        .forEach((block) => {
                            block.sourceColumn = sourceColumn;
                            blocks.push(block);
                        });
                });
                const sourceY = (block) => {
                    if (Number.isFinite(block.sourceY)) return block.sourceY;
                    return Math.max(
                        ...(block.sourceLines || []).map((line) => Number(line.y) || 0),
                        0
                    );
                };
                blocks.sort((left, right) => {
                    const vertical = sourceY(right) - sourceY(left);
                    if (Math.abs(vertical) > 3) return vertical;
                    if (left.sourceColumn === right.sourceColumn) return 0;
                    return left.sourceColumn === 'left' ? -1 : 1;
                });
                blocks.pageLayout.readingColumns = 2;
                blocks.pageLayout.columnSplitRatio = readingColumns.split
                    / Math.max(Number(pageWidth) || 1, 1);
                const smallerColumnRatio = Math.min(
                    readingColumns.leftLineCount,
                    readingColumns.rightLineCount
                ) / Math.max(
                    readingColumns.leftLineCount,
                    readingColumns.rightLineCount
                );
                if (smallerColumnRatio <= 0.55) {
                    blocks.pageLayout.sideRail = readingColumns.leftLineCount
                        < readingColumns.rightLineCount
                        ? 'left'
                        : 'right';
                }
            } else {
                extractPdfBlocksFromLines(
                    builtLines,
                    preserveTables,
                    pageHeight,
                    tableGeometry
                )
                    .forEach((block) => blocks.push(block));
            }
            blocks.forEach((block) => {
                if (block.type === 'spacer') return;
                const position = detectPdfBlockPosition(
                    block.sourceLines,
                    { pageWidth, pageHeight }
                );
                if (
                    block.sourceColumn
                    && block.sourceLines?.length >= 2
                    && position.alignment === 'right'
                ) {
                    // Page-column location is stored separately. Keep the prose
                    // itself left-aligned so narrow Kobos do not become ragged.
                    position.alignment = 'left';
                }
                Object.assign(block, position);
            });
            return blocks;
        }

        function pdfLineStartsStructuredBlock(line) {
            const text = (line?.plainText || '').trim();
            return /^(?:[•●▪◦*-]|\(?\d{1,3}[\).]|[A-Z][\).])\s+\S/.test(text);
        }

        function shouldBreakPdfParagraph(previousLine, line, {
            typicalLineAdvance,
            textLeft,
            textWidth,
            typicalStart
        }) {
            const verticalGap = previousLine.y - line.y;
            if (
                verticalGap > Math.max(
                    previousLine.lineHeight * 1.72,
                    typicalLineAdvance * 1.45
                )
            ) {
                return true;
            }
            if (pdfLineStartsStructuredBlock(line)) return true;

            const previousText = (previousLine.plainText || '').trim();
            const nextText = (line.plainText || '').trim();
            if (!previousText || !nextText) return true;
            const averageCharacter = Math.max(
                3,
                (Number(previousLine.avgCharWidth) + Number(line.avgCharWidth)) / 2 || 4
            );
            const previousFill = (
                (Number(previousLine.xEnd) || textLeft) - textLeft
            ) / Math.max(textWidth, 1);
            const startShift = (
                (Number(line.xStart) || typicalStart) - typicalStart
            ) / averageCharacter;
            const startsAsContinuation = /^[a-z,.;:!?)}\]’”]/.test(nextText);
            const previousIsOpen = /[-–—,;:(\[/]$/.test(previousText)
                || !/[.!?]["'’”)}\]]?$/.test(previousText);
            if (startsAsContinuation || previousIsOpen || previousFill >= 0.74) {
                return false;
            }

            const familyChanged = previousLine.dominantFontFamily
                && line.dominantFontFamily
                && previousLine.dominantFontFamily !== line.dominantFontFamily;
            const sizeRatio = (line.maxHeight || line.lineHeight || 10)
                / Math.max(previousLine.maxHeight || previousLine.lineHeight || 10, 1);
            if (familyChanged && (sizeRatio < 0.86 || sizeRatio > 1.16)) return true;

            const previousEndsSentence = /[.!?]["'’”)}\]]?$/.test(previousText);
            const nextStartsUppercase = /^[A-Z“"'‘]/.test(nextText);
            if (
                previousEndsSentence
                && nextStartsUppercase
                && (previousFill < 0.68 || Math.abs(startShift) >= 2.5)
            ) {
                return true;
            }
            return false;
        }

        function renderPdfParagraphHtml(lines) {
            return lines
                .map((line, index) => renderPdfLineHtml(
                    line,
                    { preserveIndent: index === 0 }
                ))
                .join(' ');
        }

        function pdfIndentLevelFromX(xStart, textLeft, avgCharWidth) {
            const delta = Math.max(0, (Number(xStart) || 0) - (Number(textLeft) || 0));
            const chars = delta / Math.max(Number(avgCharWidth) || 4, 2);
            if (chars >= 8) return 2;
            if (chars >= 3.5) return 1;
            return 0;
        }

        function promotePdfListBlocks(blocks, { textLeft = 0 } = {}) {
            if (!blocks?.length) return blocks || [];
            const output = [];
            let listRun = [];

            const flushListRun = () => {
                if (!listRun.length) return;
                // Build nested structure as flat HTML with nested ol/ul.
                const rootItems = [];
                const stack = []; // { level, format, children }
                listRun.forEach((item) => {
                    while (stack.length && stack[stack.length - 1].level >= item.level) {
                        stack.pop();
                    }
                    const node = {
                        level: item.level,
                        format: item.format,
                        html: item.html,
                        children: []
                    };
                    if (!stack.length) {
                        rootItems.push(node);
                    } else {
                        stack[stack.length - 1].children.push(node);
                    }
                    stack.push(node);
                });

                const renderNodes = (nodes) => {
                    if (!nodes.length) return '';
                    // Group consecutive same-format siblings into one list
                    let html = '';
                    let index = 0;
                    while (index < nodes.length) {
                        const format = nodes[index].format || 'decimal';
                        const tag = format === 'bullet' ? 'ul' : 'ol';
                        const style = format === 'bullet'
                            ? 'disc'
                            : format === 'lowerLetter'
                                ? 'lower-alpha'
                                : format === 'upperLetter'
                                    ? 'upper-alpha'
                                    : format === 'lowerRoman'
                                        ? 'lower-roman'
                                        : format === 'upperRoman'
                                            ? 'upper-roman'
                                            : 'decimal';
                        let j = index;
                        while (j < nodes.length && (nodes[j].format || 'decimal') === format) j += 1;
                        html += `<${tag} class="kf-list" data-kf-list-format="${format}" style="list-style-type:${style}">`;
                        for (let k = index; k < j; k += 1) {
                            const node = nodes[k];
                            html += `<li data-kf-list-level="${node.level}" data-kf-list-format="${format}">${node.html}`;
                            if (node.children.length) html += renderNodes(node.children);
                            html += '</li>';
                        }
                        html += `</${tag}>`;
                        index = j;
                    }
                    return html;
                };

                output.push({
                    type: 'paragraph',
                    text: listRun.map((item) => item.text).join(' '),
                    html: renderNodes(rootItems),
                    sourceLines: listRun.flatMap((item) => item.sourceLines || [])
                });
                listRun = [];
            };

            blocks.forEach((block) => {
                if (block.type !== 'paragraph') {
                    flushListRun();
                    output.push(block);
                    return;
                }
                const text = (block.text || '').trim();
                const firstLine = (block.sourceLines || [])[0];
                const indentLevel = pdfIndentLevelFromX(
                    firstLine?.xStart,
                    textLeft,
                    firstLine?.avgCharWidth
                );
                const marker = detectPlainListMarker(text, { indentLevel });
                if (!marker) {
                    flushListRun();
                    output.push(block);
                    return;
                }
                // Strip leading marker from HTML when present as plain text start
                let html = block.html || escapeHtml(marker.body);
                const plainStart = text.slice(0, (marker.marker || '').length + 1);
                if (text.startsWith(marker.marker)) {
                    // Rebuild simple body; keep rich html if marker wasn't in HTML runs
                    if ((block.html || '').includes(marker.marker)) {
                        html = (block.html || '').replace(
                            new RegExp(`^\\s*${marker.marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`),
                            ''
                        );
                    } else {
                        html = escapeHtml(marker.body);
                    }
                }
                listRun.push({
                    level: marker.level,
                    format: marker.format,
                    html,
                    text: marker.body,
                    sourceLines: block.sourceLines || []
                });
            });
            flushListRun();
            return output;
        }

        function linesToParagraphBlocks(builtLines) {
            const lineAdvances = [];
            for (let index = 0; index < builtLines.length - 1; index += 1) {
                const advance = builtLines[index].y - builtLines[index + 1].y;
                if (advance > 0) lineAdvances.push(advance);
            }
            const typicalLineAdvance = median(lineAdvances)
                || median(builtLines.map((line) => line.lineHeight || 10)) * 1.5;
            // Soft-hyphen join across line breaks
            const joined = [];
            for (let i = 0; i < builtLines.length; i += 1) {
                const line = {
                    ...builtLines[i],
                    pdfRuns: (builtLines[i].pdfRuns || []).map((run) => ({ ...run }))
                };
                if (
                    joined.length
                    && /[A-Za-z]-$/.test(joined[joined.length - 1].plainText)
                    && /^[a-z]/.test(line.plainText)
                ) {
                    const prev = joined[joined.length - 1];
                    const mergedText = prev.plainText.replace(/-$/, '') + line.plainText;
                    prev.plainText = mergedText;
                    prev.rawText = prev.rawText.replace(/-\s*$/, '') + line.plainText;
                    for (let runIndex = prev.pdfRuns.length - 1; runIndex >= 0; runIndex -= 1) {
                        const run = prev.pdfRuns[runIndex];
                        if (!(run.text || '').length) continue;
                        run.text = run.text.replace(/-\s*$/, '');
                        break;
                    }
                    line.pdfRuns.forEach((run) => appendPdfRun(prev.pdfRuns, run.text, run));
                    prev.y = line.y;
                    prev.lineHeight = Math.max(prev.lineHeight || 0, line.lineHeight || 0);
                    prev.maxHeight = Math.max(prev.maxHeight || 0, line.maxHeight || 0);
                    prev.hasBold = prev.hasBold || line.hasBold;
                    prev.hasItalic = prev.hasItalic || line.hasItalic;
                    prev.xEnd = line.xEnd;
                    continue;
                }
                joined.push(line);
            }

            const bodyLines = joined.filter((line) => !lineLooksLikeHeading(line));
            const metricLines = bodyLines.length ? bodyLines : joined;
            const textLeft = Math.min(
                ...metricLines.map((line) => Number(line.xStart) || 0)
            );
            const textRight = Math.max(
                ...metricLines.map((line) => Number(line.xEnd) || textLeft)
            );
            const textWidth = Math.max(textRight - textLeft, 1);
            const typicalStart = median(
                metricLines
                    .filter((line) => (line.plainText || '').trim().length >= 12)
                    .map((line) => Number(line.xStart) || textLeft)
            ) || textLeft;
            const blocks = [];
            let current = [];
            let previousLine = null;

            const flushPara = () => {
                if (!current.length) return;
                blocks.push({
                    type: 'paragraph',
                    text: current.map((line) => (line.plainText || '').trim()).join(' '),
                    html: renderPdfParagraphHtml(current),
                    sourceLines: current.slice()
                });
                current = [];
            };

            for (let index = 0; index < joined.length; index += 1) {
                const line = joined[index];
                const heading = lineLooksLikeHeading(line);
                const gapAbove = previousLine ? previousLine.y - line.y : Number.POSITIVE_INFINITY;
                const isolatedAbove = !previousLine
                    || !current.length
                    || gapAbove > Math.max(
                        previousLine.lineHeight * 1.3,
                        (previousLine.medianHeight || 10) * 1.2
                    );
                if (heading && isolatedAbove) {
                    flushPara();
                    const headingLines = [line];
                    let lastHeadingLine = line;
                    while (index + 1 < joined.length) {
                        const nextLine = joined[index + 1];
                        const nextHeading = lineLooksLikeHeading(nextLine);
                        const nextGap = lastHeadingLine.y - nextLine.y;
                        const sameTitleRun = nextHeading
                            && nextHeading.level === heading.level
                            && nextLine.dominantFontFamily === line.dominantFontFamily
                            && nextGap <= Math.max(
                                lastHeadingLine.lineHeight * 1.7,
                                (lastHeadingLine.medianHeight || 10) * 1.7
                            );
                        if (!sameTitleRun) break;
                        headingLines.push(nextLine);
                        lastHeadingLine = nextLine;
                        index += 1;
                    }
                    blocks.push({
                        type: 'heading',
                        level: heading.level,
                        text: headingLines.map((item) => item.plainText).join('\n'),
                        html: headingLines
                            .map((item) => renderPdfLineHtml(item, { preserveIndent: false }))
                            .join('<br>'),
                        sourceLines: headingLines.slice()
                    });
                    previousLine = lastHeadingLine;
                    continue;
                }

                if (!previousLine) {
                    current.push(line);
                    previousLine = line;
                    continue;
                }

                const paragraphBreak = shouldBreakPdfParagraph(
                    previousLine,
                    line,
                    {
                        typicalLineAdvance,
                        textLeft,
                        textWidth,
                        typicalStart
                    }
                );

                if (paragraphBreak) {
                    flushPara();
                    current = [line];
                } else {
                    current.push(line);
                }
                previousLine = line;
            }

            flushPara();

            return blocks.filter((b) => b.text || b.type === 'heading');
        }

        function plainTextToStructuredHtml(text) {
            return String(text || '')
                .replace(/\r\n?/g, '\n')
                .split('\f')
                .map((pageText) => (
                    pageText
                        .split(/\n{2,}/)
                        .map((paragraph) => paragraph.trimEnd())
                        .filter(Boolean)
                        .map((paragraph) => (
                            `<p class="preserve-structure">${escapeHtml(paragraph)}</p>`
                        ))
                        .join('')
                ))
                .join('<hr class="kf-page-break">');
        }

        function isMarkdownTableBlock(block) {
            const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
            if (lines.length < 2) return false;
            if (!lines.every((l) => l.includes('|'))) return false;
            const sep = lines[1].replace(/\s/g, '');
            return /^\|?[:\-]+(\|[:\-]+)+\|?$/.test(sep);
        }

        function markdownTableToHtml(block) {
            const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
            const parseRow = (line) => {
                let s = line.trim();
                if (s.startsWith('|')) s = s.slice(1);
                if (s.endsWith('|')) s = s.slice(0, -1);
                return s.split('|').map((c) => c.trim());
            };
            const header = parseRow(lines[0]);
            const body = lines.slice(2).map(parseRow);
            let html = '<table class="kobo-table"><tr>';
            header.forEach((cell) => { html += `<th>${escapeHtml(cell)}</th>`; });
            html += '</tr>';
            body.forEach((row) => {
                html += '<tr>';
                for (let i = 0; i < header.length; i += 1) {
                    html += `<td>${escapeHtml(row[i] || '')}</td>`;
                }
                html += '</tr>';
            });
            html += '</table>';
            return html;
        }

        function isListBlock(block) {
            const lines = block.trim().split('\n').filter((l) => l.trim());
            if (!lines.length) return false;
            return lines.every((l) => /^\s*([-*+]|\d+\.)\s+/.test(l));
        }

        function listBlockToHtml(block) {
            const lines = block.trim().split('\n').filter((l) => l.trim());
            const ordered = /^\s*\d+\./.test(lines[0]);
            const tag = ordered ? 'ol' : 'ul';
            const items = lines.map((l) => {
                const text = l.replace(/^\s*([-*+]|\d+\.)\s+/, '');
                return `<li>${inlineMarkdown(text)}</li>`;
            }).join('');
            return `<${tag}>${items}</${tag}>`;
        }

        function inlineMarkdown(text) {
            let s = escapeHtml(text);
            s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
            s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
            return s;
        }

        function markdownLikeToHtml(text) {
            const preserve = preserveTablesEnabled();
            const blocks = String(text || '')
                .replace(/\r\n?/g, '\n')
                .replace(/\f/g, '\n\n\\pagebreak\n\n')
                .split(/\n{2,}/)
                .filter(Boolean);
            return blocks.map((block) => {
                const trimmed = block.trimEnd();
                if (
                    /^(?:\\(?:pagebreak|newpage)|<!--\s*pagebreak\s*-->)$/i
                        .test(trimmed.trim())
                ) {
                    return '<hr class="kf-page-break">';
                }
                if (preserve && isMarkdownTableBlock(trimmed)) {
                    return markdownTableToHtml(trimmed);
                }
                if (isListBlock(trimmed)) return listBlockToHtml(trimmed);
                if (trimmed.startsWith('### ')) return `<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`;
                if (trimmed.startsWith('## ')) return `<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`;
                if (trimmed.startsWith('# ')) return `<h1>${inlineMarkdown(trimmed.slice(2))}</h1>`;
                return `<p class="preserve-structure">${inlineMarkdown(trimmed)}</p>`;
            }).join('');
        }

        /**
         * Split body HTML into chapters on H1 only (H2 stays in-flow).
         * First prose before any H1 becomes "Front matter" when other chapters exist.
         */
        function splitBodyIntoChapters(bodyHtml, bookTitle) {
            const doc = new DOMParser().parseFromString(
                `<div id="root">${bodyHtml}</div>`,
                'text/html'
            );
            const root = doc.getElementById('root');
            if (!root) {
                return [{ id: 'ch1', title: bookTitle, html: bodyHtml }];
            }

            // An attributed Word/editor wrapper can carry inherited typography
            // across several H1 chapters. Split it into attribute-preserving
            // sibling wrappers so each direct H1 remains a real spine boundary.
            root.querySelectorAll('div').forEach((div) => {
                if (
                    div.attributes.length === 0
                    || div.classList?.contains('kf-page-break')
                    || div.classList?.contains('kf-blank-page')
                    || div.classList?.contains('kf-page-label')
                    || div.classList?.contains('kf-chapter-marker')
                ) return;
                const directHeadingCount = Array.from(div.children)
                    .filter((child) => child.tagName === 'H1')
                    .length;
                if (!directHeadingCount) return;
                const chunks = [];
                let chunk = [];
                Array.from(div.childNodes).forEach((child) => {
                    const substantiveChunk = chunk.some((node) => (
                        node.nodeType === 1
                        || (node.nodeType === 3 && !!(node.nodeValue || '').trim())
                    ));
                    if (
                        child.nodeType === 1
                        && child.tagName === 'H1'
                        && substantiveChunk
                    ) {
                        chunks.push(chunk);
                        chunk = [];
                    }
                    chunk.push(child);
                });
                if (chunk.length) chunks.push(chunk);
                if (chunks.length <= 1) return;
                const fragment = doc.createDocumentFragment();
                chunks.forEach((nodes) => {
                    const wrapper = div.cloneNode(false);
                    nodes.forEach((node) => wrapper.appendChild(node));
                    fragment.appendChild(wrapper);
                });
                div.replaceWith(fragment);
            });

            // Flatten contenteditable wrappers: unwrap bare <div> that only hold a heading/block
            root.querySelectorAll('div').forEach((div) => {
                if (
                    div.classList?.contains('kf-page-break')
                    || div.classList?.contains('kf-blank-page')
                    || div.classList?.contains('kf-page-label')
                    || div.classList?.contains('kf-chapter-marker')
                ) return;
                const onlyHeading = div.children.length === 1
                    && /^(H1|H2)$/.test(div.children[0].tagName)
                    && !(div.textContent || '').replace(div.children[0].textContent || '', '').trim()
                    && div.attributes.length === 0;
                if (onlyHeading) {
                    div.replaceWith(div.children[0]);
                }
            });

            const chapters = [];
            let buf = [];
            let title = bookTitle;
            let started = false;

            const flush = () => {
                const html = buf.join('').trim();
                if (!html && !started) return;
                chapters.push({
                    id: `ch${chapters.length + 1}`,
                    title: title || `Chapter ${chapters.length + 1}`,
                    html: html || '<p></p>'
                });
                buf = [];
            };

            const walk = (parent) => {
                for (const node of Array.from(parent.childNodes)) {
                    if (node.nodeType === 1) {
                        const tag = node.tagName.toLowerCase();
                        if (tag === 'div' && (
                            node.classList?.contains('kf-page-label')
                            || node.classList?.contains('kf-chapter-marker')
                            || node.classList?.contains('kf-page-break')
                            || node.classList?.contains('kf-blank-page')
                        )) {
                            if (
                                node.classList.contains('kf-page-break')
                                || node.classList.contains('kf-blank-page')
                            ) {
                                buf.push(node.outerHTML);
                            }
                            continue;
                        }
                        const firstWrapperContent = tag === 'div'
                            ? Array.from(node.childNodes).find((child) => (
                                child.nodeType !== 8
                                && !(
                                    child.nodeType === 3
                                    && !(child.nodeValue || '').trim()
                                )
                            ))
                            : null;
                        const wrappedH1 = firstWrapperContent?.nodeType === 1
                            && firstWrapperContent.tagName === 'H1'
                            ? firstWrapperContent
                            : null;
                        // Spine splits on H1 only — H2 section titles stay continuous.
                        // Word/editor wrappers around a sole H1 stay intact.
                        if (tag === 'h1' || wrappedH1) {
                            const chapterHeading = wrappedH1 || node;
                            let trailingBreaks = 0;
                            while (buf.length && /class=["'][^"']*\bkf-(?:page-break|blank-page)\b/.test(buf[buf.length - 1])) {
                                trailingBreaks += 1;
                                buf.pop();
                            }
                            const hasPriorSpineContent = started || buf.length > 0;
                            if (hasPriorSpineContent) flush();
                            title = (chapterHeading.textContent || '').trim()
                                || `Chapter ${chapters.length + 1}`;
                            started = true;
                            // A spine boundary consumes one authored break. Any
                            // additional boundary is an intentional blank page.
                            const blankPages = Math.max(
                                0,
                                trailingBreaks - (hasPriorSpineContent ? 1 : 0)
                            );
                            for (let index = 0; index < blankPages; index += 1) {
                                buf.push('<div class="kf-blank-page"></div>');
                            }
                            buf.push(node.outerHTML);
                            continue;
                        }
                        // Contenteditable often wraps blocks in div — recurse if no direct semantic
                        if (
                            tag === 'div'
                            && !node.classList?.contains('kobo-table')
                            && node.attributes.length === 0
                        ) {
                            const hasBlockChild = node.querySelector('h1, h2, h3, p, table, ul, ol');
                            if (hasBlockChild && node.children.length) {
                                walk(node);
                                continue;
                            }
                        }
                        buf.push(node.outerHTML);
                    } else if (node.nodeType === 3 && node.textContent.trim()) {
                        buf.push(`<p>${escapeHtml(node.textContent)}</p>`);
                    }
                }
            };
            walk(root);
            flush();

            if (!chapters.length) {
                return [{ id: 'ch1', title: bookTitle, html: bodyHtml || '<p></p>' }];
            }
            if (chapters[0] && chapters[0].title === bookTitle && chapters.length > 1) {
                const first = chapters[0].html.replace(/<[^>]+>/g, ' ').trim();
                if (!first) chapters.shift();
                else chapters[0].title = 'Front matter';
            }
            return chapters;
        }

        function stripInvalidXmlChars(text) {
            // XML 1.0 disallows most C0 controls; they crash Kobo/ADE after the first
            // well-formed page/chapter when they appear later in the spine.
            return String(text || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
        }

        /**
         * EPUB/Kobo-safe body prep:
         * - Drop pre-wrap (Kobo often freezes page-turn on pre-wrap blocks)
         * - Turn soft newlines into <br/> so line structure survives without pre-wrap
         * - Allow table page breaks (page-break-inside:avoid on a large false table traps page 1)
         * - Flatten empty anchors / chrome that survived export
         */
        function prepareHtmlForEpub(html) {
            const doc = new DOMParser().parseFromString(
                `<div id="root">${html || ''}</div>`,
                'text/html'
            );
            const root = doc.getElementById('root');
            if (!root) return html || '';

            root.querySelectorAll('.kf-page-label, .kf-chapter-marker').forEach((el) => el.remove());

            // convert preserve-structure paragraphs → normal flow + <br/>
            root.querySelectorAll('p.preserve-structure, pre').forEach((el) => {
                const tag = el.tagName.toLowerCase();
                if (tag === 'pre') {
                    const p = doc.createElement('p');
                    Array.from(el.attributes).forEach((attribute) => {
                        p.setAttribute(attribute.name, attribute.value);
                    });
                    while (el.firstChild) p.appendChild(el.firstChild);
                    el.replaceWith(p);
                    const walker = doc.createTreeWalker(p, NodeFilter.SHOW_TEXT);
                    const textNodes = [];
                    while (walker.nextNode()) textNodes.push(walker.currentNode);
                    textNodes.forEach((textNode) => {
                        const value = textNode.nodeValue || '';
                        if (!value.includes('\n')) return;
                        const parts = value.split('\n');
                        const fragment = doc.createDocumentFragment();
                        parts.forEach((part, index) => {
                            fragment.appendChild(doc.createTextNode(part));
                            if (index < parts.length - 1) {
                                fragment.appendChild(doc.createElement('br'));
                            }
                        });
                        textNode.parentNode.replaceChild(fragment, textNode);
                    });
                    return;
                }
                el.classList.remove('preserve-structure');
                if (!el.className) el.removeAttribute('class');
                // Walk text nodes and inject br for newlines (keep nested elements)
                const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                const textNodes = [];
                while (walker.nextNode()) textNodes.push(walker.currentNode);
                textNodes.forEach((tn) => {
                    const value = tn.nodeValue || '';
                    if (!value.includes('\n')) return;
                    const parts = value.split('\n');
                    const frag = doc.createDocumentFragment();
                    parts.forEach((part, i) => {
                        frag.appendChild(doc.createTextNode(part));
                        if (i < parts.length - 1) frag.appendChild(doc.createElement('br'));
                    });
                    tn.parentNode.replaceChild(frag, tn);
                });
            });

            // Large tables must be allowed to break across pages on Kobo
            root.querySelectorAll('table').forEach((table) => {
                table.classList.add('kobo-table');
                table.removeAttribute('style');
            });

            // Drop empty paragraphs that only waste spine
            root.querySelectorAll('p').forEach((p) => {
                if (
                    !(p.textContent || '').trim()
                    && !p.querySelector('img, br, table, .kf-page-break, .kf-blank-page')
                ) {
                    p.remove();
                }
            });

            // Remove empty images
            root.querySelectorAll('img').forEach((img) => {
                const src = img.getAttribute('src') || '';
                if (!src) img.remove();
            });

            return root.innerHTML;
        }

        function xhtmlBodyFragment(html) {
            // Ensure void-ish hygiene for common tags; JSZip string body is XHTML.
            // Invalid XML mid-book is a classic "first page works, rest won't open" on Kobo.
            let out = stripInvalidXmlChars(prepareHtmlForEpub(html || ''));
            // Self-close void tags that are not already closed
            const voidTag = (tag) => {
                const re = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
                out = out.replace(re, (match, attrs) => {
                    if (/\/\s*>$/.test(match)) return match; // already <tag .../>
                    return `<${tag}${attrs || ''}/>`;
                });
            };
            ['br', 'hr', 'img', 'col', 'source', 'meta', 'link', 'input', 'area', 'base', 'embed', 'wbr'].forEach(voidTag);
            out = out
                .replace(/\u00a0/g, '&#160;')
                // Bare ampersands that are not already entities break XHTML parse
                .replace(/&(?![a-zA-Z][a-zA-Z0-9]*;|#[0-9]+;|#x[0-9a-fA-F]+;)/g, '&amp;');
            // Unescaped < in rare text residues (not tags)
            // Do not touch real tags — only lone < followed by space or digit
            out = out.replace(/<(?![a-zA-Z\/!])/g, '&lt;');
            return out;
        }

        /**
         * If chapter already opens with H1/H2, keep it (no duplicate title).
         * Otherwise prepend a single H1 for the spine title.
         */
        function ensureChapterTitle(html, title) {
            const trimmed = (html || '').trim();
            if (/^<h[12][\s>]/i.test(trimmed)) return trimmed;
            const doc = new DOMParser().parseFromString(`<div id="root">${trimmed}</div>`, 'text/html');
            const root = doc.getElementById('root');
            // PDF source pages already contain their original title/layout. Adding
            // a synthetic heading here would create a page absent from Edit.
            if (root?.firstElementChild?.classList?.contains('kf-pdf-page')) return trimmed;
            // Leading blank-page markers may intentionally precede the chapter
            // heading. Do not inject a duplicate title onto that blank page.
            const first = Array.from(root?.childNodes || []).find((node) => {
                if (node.nodeType === 8) return false;
                if (node.nodeType === 3) return !!(node.nodeValue || '').trim();
                return !node.classList?.contains('kf-page-break')
                    && !node.classList?.contains('kf-blank-page');
            });
            if (first?.nodeType === 1) {
                const tag = first.tagName.toLowerCase();
                if (tag === 'h1' || tag === 'h2') return trimmed;
                const wrappedHeading = first.querySelector?.(':scope > h1, :scope > h2');
                if (wrappedHeading) return trimmed;
            }
            return `<h1>${escapeXml(title)}</h1>${trimmed}`;
        }

        function decodeImageDataUrl(source) {
            const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/i.exec(source || '');
            if (!match || !match[1].toLowerCase().startsWith('image/')) return null;
            const mediaType = match[1].toLowerCase();
            let bytes;
            if (match[2]) {
                const binary = atob(match[3]);
                bytes = new Uint8Array(binary.length);
                for (let index = 0; index < binary.length; index += 1) {
                    bytes[index] = binary.charCodeAt(index);
                }
            } else {
                bytes = new TextEncoder().encode(decodeURIComponent(match[3]));
            }
            const extension = {
                'image/jpeg': 'jpg',
                'image/png': 'png',
                'image/gif': 'gif',
                'image/svg+xml': 'svg',
                'image/webp': 'webp'
            }[mediaType] || 'png';
            return { mediaType, extension, bytes };
        }

        function extractEmbeddedImagesForEpub(html) {
            const doc = new DOMParser().parseFromString(
                `<div id="root">${html || ''}</div>`,
                'text/html'
            );
            const root = doc.getElementById('root');
            if (!root) return { html: html || '', assets: [] };
            const bySource = new Map();
            const assets = [];

            root.querySelectorAll('img').forEach((img) => {
                Array.from(img.attributes).forEach((attribute) => {
                    if (attribute.name.startsWith('data-kf-')) img.removeAttribute(attribute.name);
                });
                img.classList.remove('kf-inline-image');
                if (!img.className) img.removeAttribute('class');
                const source = img.getAttribute('src') || '';
                if (!source.startsWith('data:image/')) return;
                let asset = bySource.get(source);
                if (!asset) {
                    const decoded = decodeImageDataUrl(source);
                    if (!decoded) return;
                    const number = assets.length + 1;
                    asset = {
                        id: `image-${number}`,
                        fileName: `image-${number}.${decoded.extension}`,
                        mediaType: decoded.mediaType,
                        bytes: decoded.bytes
                    };
                    assets.push(asset);
                    bySource.set(source, asset);
                }
                img.setAttribute('src', `images/${asset.fileName}`);
            });
            return { html: root.innerHTML, assets };
        }

        function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.92) {
            return new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Browser could not encode a fixed-layout PDF page.'));
                }, type, quality);
            });
        }

        function fixedLayoutTargetKey(file = currentFile) {
            const target = documentImageTarget();
            return [
                file?.name || '',
                file?.size || 0,
                file?.lastModified || 0,
                target.profileKey,
                target.orientation,
                target.width,
                target.height
            ].join('|');
        }

        async function renderPdfFixedLayoutPages(file, renderToken) {
            if (!file || !/\.pdf$/i.test(file.name || '')) {
                throw new Error('Fixed-layout export requires a PDF source.');
            }
            await loadPdfJs();
            const data = new Uint8Array((await file.arrayBuffer()).slice(0));
            const pdf = await pdfjsLib.getDocument({
                data,
                useSystemFonts: true,
                isEvalSupported: false
            }).promise;
            const target = documentImageTarget();
            const total = pdf.numPages || 1;
            const oversample = total > 80 ? 1 : total > 30 ? 1.1 : 1.25;
            const pages = [];

            try {
                for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
                    if (renderToken !== fixedLayoutRenderToken || file !== currentFile) {
                        pages.forEach((page) => URL.revokeObjectURL(page.previewUrl));
                        return null;
                    }
                    const page = await pdf.getPage(pageNumber);
                    const base = page.getViewport({ scale: 1 });
                    const fitScale = Math.min(
                        target.width / Math.max(base.width, 1),
                        target.height / Math.max(base.height, 1)
                    );
                    let scale = Math.max(1, Math.min(3.2, fitScale * oversample));
                    const estimatedPixels = base.width * base.height * scale * scale;
                    const maxPagePixels = 4_800_000;
                    if (estimatedPixels > maxPagePixels) {
                        scale *= Math.sqrt(maxPagePixels / estimatedPixels);
                    }
                    const viewport = page.getViewport({ scale });
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(viewport.width));
                    canvas.height = Math.max(1, Math.round(viewport.height));
                    const context = canvas.getContext('2d', { alpha: false });
                    if (!context) throw new Error('Canvas is unavailable for fixed-layout rendering.');
                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    await page.render({
                        canvasContext: context,
                        viewport,
                        background: '#ffffff'
                    }).promise;

                    let text = '';
                    try {
                        const textContent = await page.getTextContent();
                        text = (textContent.items || []).map((item) => (
                            `${item?.str || ''}${item?.hasEOL ? '\n' : ' '}`
                        )).join('').replace(/[^\S\n]+/g, ' ').trim();
                    } catch (_) { /* visual page remains valid without hidden text */ }

                    const designReasons = (
                        currentOutput?.fixedLayoutRecommendation?.pages?.[pageNumber - 1]?.reasons
                        || []
                    );
                    const hasRasterArtwork = designReasons.some((reason) => (
                        /image|artwork|scanned/i.test(reason)
                    ));
                    // InDesign-style automatic image choice: lossless PNG keeps
                    // text/vector worksheets crisp; JPEG contains photo-heavy
                    // pages and long publications without runaway file sizes.
                    const mediaType = total <= 30 && !hasRasterArtwork
                        ? 'image/png'
                        : 'image/jpeg';
                    const blob = await canvasToBlob(
                        canvas,
                        mediaType,
                        mediaType === 'image/jpeg' ? 0.92 : undefined
                    );
                    const bytes = new Uint8Array(await blob.arrayBuffer());
                    const previewUrl = URL.createObjectURL(blob);
                    pages.push({
                        width: canvas.width,
                        height: canvas.height,
                        mediaType,
                        bytes,
                        text,
                        previewUrl
                    });
                    canvas.width = 1;
                    canvas.height = 1;
                    page.cleanup?.();
                    setProgress(
                        90 + (pageNumber / total) * 8,
                        `Fixed page ${pageNumber}/${total}`
                    );
                    await new Promise((resolve) => setTimeout(resolve, 0));
                }
            } catch (error) {
                pages.forEach((page) => URL.revokeObjectURL(page.previewUrl));
                throw error;
            } finally {
                try {
                    pdf.destroy?.();
                } catch (_) { /* ignore */ }
            }
            return pages;
        }

        async function ensureFixedLayoutPages() {
            if (resolvedEpubLayout() !== 'fixed' || !currentFile) return null;
            const key = fixedLayoutTargetKey();
            if (fixedLayoutCache?.key === key && fixedLayoutCache.pages?.length) {
                return fixedLayoutCache.pages;
            }
            if (fixedLayoutPromise?.key === key) return fixedLayoutPromise.promise;

            const token = ++fixedLayoutRenderToken;
            const file = currentFile;
            const promise = renderPdfFixedLayoutPages(file, token).then((pages) => {
                if (
                    !pages
                    || token !== fixedLayoutRenderToken
                    || file !== currentFile
                ) {
                    return null;
                }
                fixedLayoutCache = { key, file, pages };
                return pages;
            }).finally(() => {
                if (fixedLayoutPromise?.key === key) fixedLayoutPromise = null;
            });
            fixedLayoutPromise = { key, promise };
            return promise;
        }

        async function buildFixedLayoutEpubBlob({ title, author, lang = 'en' }) {
            const pages = await ensureFixedLayoutPages();
            if (!pages?.length) {
                throw new Error('No PDF pages were available for fixed-layout export.');
            }
            const JSZipCtor = await waitForGlobal('JSZip');
            const zip = new JSZipCtor();
            const files = buildFixedLayoutPublicationFiles({
                title,
                author,
                lang,
                identifier: `urn:uuid:${crypto.randomUUID()}`,
                modified: new Date().toISOString(),
                pages
            });
            zip.file('mimetype', files.get('mimetype'), { compression: 'STORE' });
            files.forEach((value, path) => {
                if (path === 'mimetype') return;
                zip.file(path, value);
            });
            return zip.generateAsync({
                type: 'blob',
                mimeType: 'application/epub+zip',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });
        }

        async function buildEpubBlob({ title, author, lang = 'en', bodyHtml, splitChapters = true }) {
            const JSZipCtor = await waitForGlobal('JSZip');
            const zip = new JSZipCtor();
            zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
            zip.folder('META-INF').file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

            const oebps = zip.folder('OEBPS');
            // Kobo-friendly CSS — critical pagination rules:
            // - no white-space:pre-wrap (blocks page-turn on many firmwares)
            // - no page-break-inside:avoid on full tables (traps reader on page 1)
            // - height:auto so content can reflow across pages
            oebps.file('styles.css', [
                'html,body{height:auto !important;max-height:none !important;overflow:visible !important;}',
                'body{font-family:Georgia,"Times New Roman",serif;line-height:1.55;margin:3% 4%;color:#111;-webkit-hyphens:auto;hyphens:auto;orphans:2;widows:2;}',
                /* Do NOT use page-break-after:avoid — some Kobo builds refuse to paginate past a heading */
                'h1,h2,h3{margin:1.25em 0 .55em;line-height:1.25;font-family:Georgia,serif;page-break-after:auto;page-break-inside:auto;}',
                'h1{font-size:1.45em;}h2{font-size:1.22em;}h3{font-size:1.08em;}',
                'p{margin:0 0 0.85em;text-align:justify;page-break-inside:auto;page-break-before:auto;page-break-after:auto;}',
                'h1.kf-pdf-block,h2.kf-pdf-block,h3.kf-pdf-block,p.kf-pdf-block{font-size:1em;font-family:inherit;text-align:left;}',
                '.kf-pdf-page{display:block;box-sizing:border-box;width:100%;page-break-inside:auto;break-inside:auto;}',
                '.kf-pdf-page::after{display:table;clear:both;content:"";}',
                '.kf-pdf-page+.kf-pdf-page{margin-top:0;page-break-before:always;break-before:page;}',
                '.kf-pdf-blank-page{height:0;page-break-after:always;break-after:page;}',
                '.kf-pdf-image-page figure.kf-document-image{margin:0;page-break-inside:avoid;break-inside:avoid;}',
                '.kf-pdf-image-page figure.kf-document-image img{display:block;width:auto !important;max-width:100%;max-height:90vh;margin:0 auto;}',
                '.kf-page-offset-0{padding-top:0;}.kf-page-offset-1{padding-top:1.8em;}.kf-page-offset-2{padding-top:3.6em;}.kf-page-offset-3{padding-top:5.4em;}.kf-page-offset-4{padding-top:7.2em;}.kf-page-offset-5{padding-top:9em;}.kf-page-offset-6{padding-top:10.8em;}.kf-page-offset-7{padding-top:12.6em;}.kf-page-offset-8{padding-top:14.4em;}',
                '.kf-align-left{text-align:left !important;}.kf-align-center{text-align:center !important;}.kf-align-right{text-align:right !important;}',
                '.kf-align-justify{display:block !important;width:100% !important;max-width:100% !important;box-sizing:border-box !important;text-align:justify !important;text-justify:inter-word !important;text-align-last:left;hyphens:auto;-webkit-hyphens:auto;}',
                'sup,sub{font-size:.75em;line-height:1;}',
                'sup,.kf-verse-num{vertical-align:super;}',
                'sub{vertical-align:sub;}',
                'sup.kf-verse-num{font-weight:700;font-size:.72em;margin-right:.12em;white-space:nowrap;}',
                '.kf-user-size-75{font-size:.75em !important;}.kf-user-size-88{font-size:.88em !important;}.kf-user-size-100{font-size:1em !important;}.kf-user-size-112{font-size:1.12em !important;}.kf-user-size-125{font-size:1.25em !important;}.kf-user-size-150{font-size:1.5em !important;}.kf-user-size-175{font-size:1.75em !important;}',
                '.kf-tab{display:inline-block;width:2.5em;min-height:1em;vertical-align:baseline;}',
                '.kf-pdf-line{display:inline;box-sizing:border-box;max-width:100%;}',
                '.kf-indent-0{padding-left:0;}.kf-indent-1{padding-left:.75em;}.kf-indent-2{padding-left:1.5em;}.kf-indent-3{padding-left:2.25em;}',
                '.kf-font-serif{font-family:Georgia,"Times New Roman",Times,serif;}.kf-font-sans{font-family:Arial,Helvetica,sans-serif;}.kf-font-mono{font-family:"Courier New",Courier,monospace;}.kf-font-script{font-family:"Brush Script MT","Segoe Script",cursive;}',
                '.kf-gap-before-1{display:inline-block;max-width:calc(100% - .75em);margin-left:.75em;}.kf-gap-before-2{display:inline-block;max-width:calc(100% - 1.5em);margin-left:1.5em;}.kf-gap-before-3{display:inline-block;max-width:calc(100% - 2.5em);margin-left:2.5em;}',
                '.kf-weight-light{font-weight:300;}.kf-size-75{font-size:.75em;}.kf-size-88{font-size:.88em;}.kf-size-100{font-size:1em;}.kf-size-112{font-size:1.12em;}.kf-size-125{font-size:1.25em;}.kf-size-150{font-size:1.5em;}.kf-size-175{font-size:1.75em;}',
                '.kf-note-space{display:block;width:100%;margin:0;page-break-inside:auto;break-inside:auto;}',
                '.kf-space-2{height:2em;}.kf-space-3{height:3em;}.kf-space-4{height:4em;}.kf-space-5{height:5em;}.kf-space-6{height:6em;}.kf-space-7{height:7em;}.kf-space-8{height:8em;}.kf-space-9{height:9em;}.kf-space-10{height:10em;}.kf-space-11{height:11em;}.kf-space-12{height:12em;}',
                'strong,b{font-weight:700;}',
                'em,i{font-style:italic;}',
                'u{text-decoration:underline;}',
                's,strike,del{text-decoration:line-through;}',
                '.kf-bold{font-weight:700 !important;}.kf-not-bold{font-weight:400 !important;}',
                '.kf-italic{font-style:italic !important;}.kf-not-italic{font-style:normal !important;}',
                '.kf-underline{text-decoration:underline !important;}.kf-strike{text-decoration:line-through !important;}.kf-underline.kf-strike{text-decoration:underline line-through !important;}.kf-no-decoration{text-decoration:none !important;}',
                '.kf-page-break{display:block;height:0;margin:0;padding:0;border:0;page-break-before:always;break-before:page;}',
                '.kf-break-before{page-break-before:always;break-before:page;}.kf-break-after{page-break-after:always;break-after:page;}',
                'span.kf-break-before,span.kf-break-after{display:block;}',
                '.kf-blank-page{display:block;height:0;margin:0;padding:0;border:0;page-break-after:always;break-after:page;}',
                'blockquote{border-left:.25em solid #888;padding-left:1em;margin:0 0 1em;color:#333;}',
                'ul,ol,.kf-list{margin:0 0 0.85em 1.25em;padding-left:0.55em;}',
                'ul{list-style-type:disc;}ol{list-style-type:decimal;}',
                'li{margin:0.28em 0;page-break-inside:auto;}',
                'li > ul,li > ol{margin-top:0.25em;margin-bottom:0.25em;}',
                '.kf-indent-1{margin-left:1.25em;}.kf-indent-2{margin-left:2.25em;}.kf-indent-3{margin-left:3.25em;}',
                'table,table.kobo-table{width:100%;border-collapse:collapse;margin:1em 0;font-size:0.88em;page-break-inside:auto !important;}',
                'thead,tbody,tr,th,td{page-break-inside:auto !important;}',
                'th,td{border:1px solid #555;padding:5px 7px;text-align:left;vertical-align:top;}',
                'th.kf-user-vpos-top,td.kf-user-vpos-top{vertical-align:top !important;}th.kf-user-vpos-middle,td.kf-user-vpos-middle{vertical-align:middle !important;}th.kf-user-vpos-bottom,td.kf-user-vpos-bottom{vertical-align:bottom !important;}',
                'th{font-weight:inherit;background:#eee;}',
                'code{font-family:monospace;font-size:0.92em;}',
                'figure.kf-document-image{margin:1em 0;text-align:center;page-break-inside:auto;}',
                'figure.kf-document-image.kf-image-inline-left,figure.kf-document-image.kf-image-inline-right{max-width:60%;margin-top:.25em;margin-bottom:.55em;}',
                'figure.kf-document-image.kf-image-inline-left,img.kf-image-inline-left{float:left;margin-left:0;margin-right:.8em;}',
                'figure.kf-document-image.kf-image-inline-right,img.kf-image-inline-right{float:right;margin-left:.8em;margin-right:0;}',
                'figure.kf-document-image.kf-image-inline-left img,figure.kf-document-image.kf-image-inline-right img{display:block;width:100%;margin:0;}',
                'img.kf-image-inline-left,img.kf-image-inline-right{display:inline-block;max-width:60%;margin-top:.2em;margin-bottom:.5em;}',
                'img{display:block;max-width:100%;height:auto;margin:.75em auto;}',
                'br{line-height:1.55;}'
            ].join(''));

            // bodyHtml should already be export-clean; strip any residual chrome
            const preparedBody = canonicalizeBody(bodyHtml, { forExport: true });
            const embeddedImages = extractEmbeddedImagesForEpub(preparedBody);
            const cleanBody = embeddedImages.html;
            if (embeddedImages.assets.length) {
                const imageFolder = oebps.folder('images');
                embeddedImages.assets.forEach((asset) => {
                    imageFolder.file(asset.fileName, asset.bytes);
                });
            }
            // Default path: ONE continuous spine item so Kobo page-turn works end-to-end.
            // Optional H1-only split when the user opts in.
            let chapters = splitChapters
                ? splitBodyIntoChapters(cleanBody, title)
                : [{ id: 'ch1', title, html: cleanBody }];

            // Drop empty spine items (blank chapters freeze some Kobo builds on next-page)
            chapters = chapters.filter((ch) => {
                const text = String(ch.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                return text.length > 0 || /<(img|table|figure)\b/i.test(ch.html || '');
            });
            if (!chapters.length) {
                chapters = [{ id: 'ch1', title, html: cleanBody || '<p>(Empty document)</p>' }];
            }

            // Safety: too many tiny spine items ≈ stuck after first section on Kobo
            if (chapters.length > 12) {
                chapters = [{ id: 'ch1', title, html: cleanBody }];
            }

            if (!splitChapters || chapters.length === 1) {
                // Single continuous chapter: ensure one H1 book title if none
                if (
                    !/<h1[\s>]/i.test(chapters[0].html)
                    && !/class=["'][^"']*\bkf-pdf-page\b/i.test(chapters[0].html)
                ) {
                    chapters[0].html = `<h1>${escapeXml(title)}</h1>${chapters[0].html}`;
                }
            }

            const tocItems = chapters.map((ch, i) =>
                `<li><a href="chapter-${i + 1}.xhtml">${escapeXml(ch.title)}</a></li>`
            ).join('\n    ');

            oebps.file('nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${escapeXml(lang)}">
<head><title>Navigation</title><link rel="stylesheet" type="text/css" href="styles.css"/></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol>
    ${tocItems}
    </ol>
  </nav>
</body>
</html>`);

            const bookId = crypto.randomUUID();
            const bookUrn = `urn:uuid:${bookId}`;

            // NCX for older Kobo / Adobe-path firmware (uid must match OPF identifier)
            const ncxNavPoints = chapters.map((ch, i) => `    <navPoint id="navPoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="chapter-${i + 1}.xhtml"/>
    </navPoint>`).join('\n');
            oebps.file('toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(bookUrn)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
${ncxNavPoints}
  </navMap>
</ncx>`);

            chapters.forEach((ch, i) => {
                const n = i + 1;
                // Avoid double titles when chapter already starts with H1 or H2
                const body = ensureChapterTitle(ch.html, ch.title);
                const safeBody = xhtmlBodyFragment(body);
                oebps.file(`chapter-${n}.xhtml`, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escapeXml(lang)}" lang="${escapeXml(lang)}">
<head>
  <title>${escapeXml(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
${safeBody}
</body>
</html>`);
            });

            const manifestItems = chapters.map((ch, i) =>
                `    <item id="ch${i + 1}" href="chapter-${i + 1}.xhtml" media-type="application/xhtml+xml"/>`
            ).join('\n');
            const imageManifestItems = embeddedImages.assets.map((asset) =>
                `    <item id="${asset.id}" href="images/${asset.fileName}" media-type="${asset.mediaType}"/>`
            ).join('\n');
            const spineItems = chapters.map((ch, i) =>
                `    <itemref idref="ch${i + 1}"/>`
            ).join('\n');

            oebps.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf" prefix="rendition: http://www.idpf.org/vocab/rendition/#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeXml(bookUrn)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>${escapeXml(lang)}</dc:language>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestItems}
${imageManifestItems}
    <item id="css" href="styles.css" media-type="text/css"/>
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`);

            return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
        }

        function documentImageTarget() {
            const profileKey = deviceSelect?.value || 'libra-colour';
            const profile = selectedDeviceProfile();
            const landscape = deviceOrientation?.value === 'landscape';
            return {
                profileKey,
                profile,
                width: landscape ? profile.screenHeight : profile.screenWidth,
                height: landscape ? profile.screenWidth : profile.screenHeight,
                orientation: landscape ? 'landscape' : 'portrait'
            };
        }

        function contrastChannel(value, contrast) {
            return Math.max(0, Math.min(255, (value - 128) * contrast + 128));
        }

        function applyEinkTreatment(context, width, height, tone, contrastPercent) {
            if (tone === 'colour' && Number(contrastPercent) === 100) return;
            const imageData = context.getImageData(0, 0, width, height);
            const pixels = imageData.data;
            const contrast = Math.max(0.2, Number(contrastPercent || 100) / 100);

            if (tone === 'colour') {
                for (let i = 0; i < pixels.length; i += 4) {
                    pixels[i] = contrastChannel(pixels[i], contrast);
                    pixels[i + 1] = contrastChannel(pixels[i + 1], contrast);
                    pixels[i + 2] = contrastChannel(pixels[i + 2], contrast);
                }
                context.putImageData(imageData, 0, 0);
                return;
            }

            if (tone === 'grayscale') {
                for (let i = 0; i < pixels.length; i += 4) {
                    const luminance = contrastChannel(
                        (pixels[i] * 0.2126) + (pixels[i + 1] * 0.7152) + (pixels[i + 2] * 0.0722),
                        contrast
                    );
                    // E Ink-friendly 16-level quantization.
                    const gray = Math.round(luminance / 17) * 17;
                    pixels[i] = gray;
                    pixels[i + 1] = gray;
                    pixels[i + 2] = gray;
                }
                context.putImageData(imageData, 0, 0);
                return;
            }

            // Floyd–Steinberg error diffusion at the device's native pixel grid.
            const luminance = new Float32Array(width * height);
            for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
                luminance[p] = contrastChannel(
                    (pixels[i] * 0.2126) + (pixels[i + 1] * 0.7152) + (pixels[i + 2] * 0.0722),
                    contrast
                );
            }
            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    const p = (y * width) + x;
                    const oldValue = luminance[p];
                    const newValue = oldValue < 128 ? 0 : 255;
                    const error = oldValue - newValue;
                    luminance[p] = newValue;
                    if (x + 1 < width) luminance[p + 1] += error * (7 / 16);
                    if (y + 1 < height) {
                        if (x > 0) luminance[p + width - 1] += error * (3 / 16);
                        luminance[p + width] += error * (5 / 16);
                        if (x + 1 < width) luminance[p + width + 1] += error * (1 / 16);
                    }
                }
            }
            for (let p = 0, i = 0; p < luminance.length; p += 1, i += 4) {
                const gray = luminance[p] < 128 ? 0 : 255;
                pixels[i] = gray;
                pixels[i + 1] = gray;
                pixels[i + 2] = gray;
            }
            context.putImageData(imageData, 0, 0);
        }

        function loadImageElement(source) {
            return new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error('Browser could not decode an embedded image.'));
                image.src = source;
            });
        }

        async function convertImageSourceForKobo(source, target = documentImageTarget()) {
            const image = await loadImageElement(source);
            const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1);
            const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1);
            const scale = Math.min(1, target.width / sourceWidth, target.height / sourceHeight);
            const width = Math.max(1, Math.round(sourceWidth * scale));
            const height = Math.max(1, Math.round(sourceHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) throw new Error('Canvas is unavailable for embedded image conversion.');

            // Kobo readers are more predictable when transparent pixels are
            // flattened to the same paper colour used by the device preview.
            context.fillStyle = '#f4f1e8';
            context.fillRect(0, 0, width, height);
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(image, 0, 0, width, height);

            const tone = target.profile.isColour ? 'colour' : 'dither';
            applyEinkTreatment(context, width, height, tone, target.profile.isColour ? 105 : 110);
            const sourceMime = /^data:([^;,]+)/i.exec(source)?.[1]?.toLowerCase() || '';
            const mimeType = tone === 'colour' && sourceMime === 'image/jpeg'
                ? 'image/jpeg'
                : 'image/png';
            return {
                dataUrl: canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.88 : undefined),
                width,
                height,
                tone,
                mimeType
            };
        }

        function nextDocumentImageId(sources) {
            let index = Object.keys(sources || {}).length + 1;
            while (sources[`kf-image-${index}`]) index += 1;
            return `kf-image-${index}`;
        }

        async function optimizeDocumentImages(
            html,
            {
                imageSources = {},
                imageVariants = {},
                target = documentImageTarget()
            } = {}
        ) {
            const doc = new DOMParser().parseFromString(
                `<div id="root">${html || ''}</div>`,
                'text/html'
            );
            const root = doc.getElementById('root');
            if (!root) {
                return { html: html || '', imageSources, imageVariants, imageCount: 0, failed: 0 };
            }

            const images = Array.from(root.querySelectorAll('img'));
            let converted = 0;
            let failed = 0;
            for (const img of images) {
                const currentSrc = img.getAttribute('src') || '';
                let imageId = img.getAttribute('data-kf-image-id') || '';
                if (!imageId) imageId = nextDocumentImageId(imageSources);
                const source = imageSources[imageId] || currentSrc;
                if (!source || !/^data:image\//i.test(source)) {
                    failed += 1;
                    continue;
                }
                imageSources[imageId] = source;
                const cacheKey = `${imageId}:${target.profileKey}:${target.orientation}`;
                try {
                    if (!imageVariants[cacheKey]) {
                        imageVariants[cacheKey] = await convertImageSourceForKobo(source, target);
                    }
                    const variant = imageVariants[cacheKey];
                    img.setAttribute('src', variant.dataUrl);
                    img.setAttribute('data-kf-image-id', imageId);
                    img.setAttribute('data-kf-pixel-size', `${variant.width}x${variant.height}`);
                    img.setAttribute('data-kf-aspect-ratio', `${variant.width}/${variant.height}`);
                    img.removeAttribute('width');
                    img.removeAttribute('height');
                    img.style.removeProperty('height');
                    img.classList.add('kf-inline-image');
                    if (!img.getAttribute('alt')) img.setAttribute('alt', 'Document image');
                    if (!img.getAttribute('data-kf-layout')) {
                        img.setAttribute('data-kf-layout', normalizedImageLayout(img));
                        img.setAttribute('data-kf-layout-mode', 'auto');
                    }
                    if (img.getAttribute('data-kf-width-mode') !== 'user') {
                        const automaticWidth = imageWidthForPageFit({
                            pixelWidth: variant.width,
                            pixelHeight: variant.height,
                            fitHeightPercent: img.getAttribute('data-kf-fit-height') || 72,
                            imageCount: img.getAttribute('data-kf-page-images') || 1,
                            layout: normalizedImageLayout(img),
                            target
                        });
                        img.setAttribute('data-kf-width', String(automaticWidth));
                        img.setAttribute('data-kf-width-mode', 'auto');
                    }
                    applyImageLayoutPresentation(img);
                    converted += 1;
                } catch (error) {
                    console.warn('[KoboForge] Embedded image conversion failed', error);
                    failed += 1;
                }
            }

            return {
                html: root.innerHTML,
                imageSources,
                imageVariants,
                imageCount: converted,
                failed
            };
        }

        async function retargetCurrentDocumentImages() {
            const output = currentOutput;
            if (!output || !Object.keys(output.imageSources || {}).length) return false;
            const token = ++documentImageConversionToken;
            const target = documentImageTarget();
            statusEl.textContent = `Optimizing embedded images for ${target.profile.name}…`;
            const common = {
                imageSources: output.imageSources,
                imageVariants: output.imageVariants || {},
                target
            };
            const body = await optimizeDocumentImages(output.bodyHtml, common);
            const original = await optimizeDocumentImages(output.originalBodyHtml, {
                imageSources: body.imageSources,
                imageVariants: body.imageVariants,
                target
            });
            if (token !== documentImageConversionToken || currentOutput !== output) return false;
            output.bodyHtml = canonicalizeBody(body.html);
            output.originalBodyHtml = canonicalizeBody(original.html);
            output.imageSources = original.imageSources;
            output.imageVariants = original.imageVariants;
            output.imageCount = body.imageCount;
            output.imageTarget = `${target.profile.name} · ${target.orientation}`;
            return true;
        }

        function slugify(input) {
            return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        }

        function escapeHtml(text) {
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        function escapeXml(text) {
            return escapeHtml(text).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
        }

        // Keep outline in sync when title changes
        bookTitleInput?.addEventListener('change', () => {
            if (currentOutput) {
                if (editMode === 'edit') syncBodyFromUi();
                refreshOutlineAndStats();
                if (editMode === 'edit' || editMode === 'diff') renderDevicePreview();
            }
        });
