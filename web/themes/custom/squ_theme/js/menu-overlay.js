/**
 * @file
 * Builds the SQU header bar and hamburger mega-menu. All three menu
 * levels are shown SIDE BY SIDE at once (not a single sliding panel):
 * clicking/hovering an item with children populates the NEXT column;
 * previous columns stay visible. The current page's section is
 * pre-highlighted and its columns pre-populated on open, matching the
 * reference design.
 */
(function (Drupal, once) {
  'use strict';

  Drupal.behaviors.squHeaderBuild = {
    attach: function (context) {
      once('squ-header-build', 'body', context).forEach(function () {
        var branding = document.querySelector('#block-squ-site-branding');
        var search = document.querySelector('#block-squ-search');
        var quickLinks = document.querySelector('.squ-header__quicklinks');
        var level1Panel = document.querySelector('.squ-menu-panel[data-level="1"]');

        // ---- Build the visible header bar ----
        var header = document.createElement('header');
        header.className = 'squ-header';

        if (branding) {
          header.appendChild(branding);
        }

        var right = document.createElement('div');
        right.className = 'squ-header__right';

        if (search) {
          search.classList.add('squ-header__search-form');
          var input = search.querySelector('input[type="search"], input[type="text"]');
          if (input) {
            input.setAttribute('placeholder', 'Search');
          }

          var searchIcon = document.createElement('span');
          searchIcon.className = 'squ-header__search-icon';
          searchIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
          search.insertBefore(searchIcon, search.firstChild);

          right.appendChild(search);

          // Starts collapsed (icon only). Clicking the pill expands it;
          // clicking anywhere outside collapses it back down.
          search.addEventListener('click', function (e) {
            if (!search.classList.contains('is-open')) {
              search.classList.add('is-open');
              if (input) {
                input.focus();
              }
              e.stopPropagation();
            }
          });
          document.addEventListener('click', function (e) {
            if (search.classList.contains('is-open') && !search.contains(e.target)) {
              search.classList.remove('is-open');
            }
          });
        }
        if (quickLinks) {
          right.appendChild(quickLinks);
        }

        var hamburger = document.createElement('button');
        hamburger.type = 'button';
        hamburger.className = 'squ-hamburger';
        hamburger.setAttribute('aria-label', 'Open menu');
        hamburger.innerHTML = '<span class="squ-hamburger__bars"><span></span><span></span><span></span></span>';
        right.appendChild(hamburger);

        header.appendChild(right);

        // ---- Build the overlay ----
        var overlay = document.createElement('div');
        overlay.className = 'squ-menu-overlay';

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'squ-menu-overlay__close';
        closeBtn.setAttribute('aria-label', 'Close menu');
        closeBtn.innerHTML = '&times;';
        overlay.appendChild(closeBtn);

        var panelsContainer = document.createElement('div');
        panelsContainer.className = 'squ-menu-overlay__panels';
        overlay.appendChild(panelsContainer);

        document.body.insertBefore(overlay, document.body.firstChild);
        document.body.insertBefore(header, document.body.firstChild);

        // ---- Mega menu cascade logic ----
        // Detach each item's nested <ul> into a lookup map instead of
        // leaving it inline, so each level renders as its own column.
        function extractChildren(ul) {
          var map = new Map();
          if (!ul) {
            return map;
          }
          Array.prototype.slice.call(ul.children).forEach(function (li) {
            var childUl = li.querySelector(':scope > ul');
            var link = li.querySelector(':scope > a');
            if (childUl) {
              childUl.parentNode.removeChild(childUl);
              map.set(link, childUl);
              link.classList.add('squ-has-children');
            }
          });
          return map;
        }

        if (!level1Panel) {
          return;
        }
        var level1List = level1Panel.querySelector(':scope > .block-inner > ul, :scope > .block-inner > nav > ul');
        var level1Children = extractChildren(level1List);

        // Column 1 is the panel Drupal already gave us.
        panelsContainer.appendChild(level1Panel);

        var column2 = document.createElement('div');
        column2.className = 'squ-menu-panel';
        column2.setAttribute('data-level', '2');
        panelsContainer.appendChild(column2);

        var column3 = document.createElement('div');
        column3.className = 'squ-menu-panel';
        column3.setAttribute('data-level', '3');
        panelsContainer.appendChild(column3);

        var level2ChildrenByLink = new Map();

        function showColumn2(link) {
          Array.prototype.forEach.call(level1List.querySelectorAll('a'), function (a) {
            a.classList.remove('is-selected');
          });
          link.classList.add('is-selected');

          column2.innerHTML = '';
          column3.innerHTML = '';

          var childUl = level1Children.get(link);
          if (!childUl) {
            return;
          }
          column2.appendChild(childUl);

          var childMap = extractChildren(childUl);
          level2ChildrenByLink = childMap;

          childMap.forEach(function (grandchildUl, childLink) {
            childLink.addEventListener('click', function (e) {
              e.preventDefault();
              showColumn3(childLink);
            });
          });

          // Auto-select the first level-2 item that has children, so the
          // third column is pre-populated too, matching the reference.
          var firstWithChildren = null;
          childMap.forEach(function (grandchildUl, childLink) {
            if (!firstWithChildren) {
              firstWithChildren = childLink;
            }
          });
          if (firstWithChildren) {
            showColumn3(firstWithChildren);
          }
        }

        function showColumn3(link) {
          if (level2ChildrenByLink) {
            level2ChildrenByLink.forEach(function (ul, l) {
              l.classList.remove('is-selected');
            });
          }
          link.classList.add('is-selected');
          column3.innerHTML = '';
          var grandchildUl = level2ChildrenByLink.get(link);
          if (grandchildUl) {
            column3.appendChild(grandchildUl);
          }
        }

        level1Children.forEach(function (childUl, link) {
          link.addEventListener('click', function (e) {
            e.preventDefault();
            showColumn2(link);
          });
        });

        function openOverlay() {
          overlay.classList.add('is-open');
          document.body.style.overflow = 'hidden';

          // Pre-select whichever level-1 item is in the active trail for
          // the current page; otherwise default to the first item that
          // has children, so columns 2/3 aren't empty on open.
          var activeLink = level1List.querySelector('a.menu__link--active-trail, a.is-active');
          if (activeLink && level1Children.has(activeLink)) {
            showColumn2(activeLink);
          }
          else {
            var firstKey = null;
            level1Children.forEach(function (v, k) {
              if (!firstKey) {
                firstKey = k;
              }
            });
            if (firstKey) {
              showColumn2(firstKey);
            }
          }
        }

        function closeOverlay() {
          overlay.classList.remove('is-open');
          document.body.style.overflow = '';
        }

        hamburger.addEventListener('click', openOverlay);
        closeBtn.addEventListener('click', closeOverlay);
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') {
            closeOverlay();
          }
        });
      });
    }
  };
})(Drupal, once);