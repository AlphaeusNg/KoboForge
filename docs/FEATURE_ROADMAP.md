# KoboForge feature roadmap

Researched 2026-10-14. Scope: browser-local, reflowable document-to-EPUB authoring.

## Needs and evidence

The repository already has editable title/author/language, document outlines, search,
undo/redo, draft recovery and backups. Image placement and resizing are available,
but authors cannot edit image descriptions without editing HTML. PDF and pasted
images receive generic labels, and image optimisation overwrites empty `alt`.

[W3C WAI's image decision tree](https://www.w3.org/WAI/tutorials/images/decision-tree/)
recommends meaningful descriptions for informative images and empty alternative text
for decoration or redundant imagery. Text inside an image needs its own equivalent;
complex graphics need equivalent information elsewhere in the document.
[EPUB Accessibility 1.1](https://www.w3.org/TR/epub-a11y-11/) applies WCAG requirements
to EPUB publications. An image description feature helps authors address one need;
it does not establish publication accessibility conformance.

## Priorities

1. **Selected-image description editor — chosen.** Add descriptions and deliberately
   mark decorative images through the existing editor, with reversible edits and
   preservation in EPUB and backups. High reader value, small browser-local scope.
2. **Conversion review checklist.** Surface generic image descriptions and suspect
   heading order for human review. Useful follow-up after authors can correct them.
3. **Local OCR for scanned pages.** Helps make image-only documents searchable and
   readable, but requires a substantial language/model download and fidelity review.
4. **Custom cover authoring.** Useful library presentation, but less urgent than
   equivalent reading content.

These priorities are inferred from the capability gap and standards guidance;
no user interview or physical Kobo accessibility testing was conducted.

## Chosen feature and acceptance

- Selecting an image reveals a labelled description input, a decorative-image
  checkbox, contextual guidance, and an explicit Save description control.
- Saving informative text writes literal `alt` text. Saving decoration writes
  `alt=""`. Empty informative descriptions prompt the author to describe the image
  or choose decoration, without modifying the book.
- Selection changes load the corresponding image; deselection hides the editor.
- Image description edits use existing undo/redo, draft and backup machinery.
- Device changes, image copying and EPUB export preserve authored descriptions and
  intentionally empty alternatives. Source HTML with `alt=""` is preserved too.
- Desktop and compact phone layouts remain usable; all processing stays local.
- Browser journeys check descriptions, undo/redo, backup, retargeting and literal
  escaped EPUB attributes. Full npm and real DOCX/PDF corpus gates remain green.
