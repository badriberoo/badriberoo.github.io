/*
 * Badri Beridze — site-specific scripts (loaded after the template's init.js).
 */

(function($){
	"use strict";

	/* Portfolio filter tabs: Posters / Motion / Branding & 3D, plus "Show more".
	   The template's tab handler (init.js) already moves the .active class
	   between the tab <li>s; this shows grid items by data-cat.
	   Each tab starts with PAGE items; "Show more" reveals PAGE more.
	   Classes: .is-hidden = other tab, .is-collapsed = not revealed yet
	   (the lightbox still browses collapsed items). */
	function portfolioFilter(){
		var PAGE	= 6;
		var filter	= $('.resumo_fn_portfolio_filter');
		var grid	= $('#portfolio .resumo_fn_portfolio_grid');
		var items	= grid.find('> ul > li');
		var $more	= $('<div class="fn_show_more"><button type="button"><span class="text">Show more</span><span class="count"></span></button></div>').appendTo(grid);
		var current = null;

		function fadeIn(li){
			li.removeClass('is-shown');
			void li[0].offsetWidth;	// restart the animation
			li.addClass('is-shown');
		}

		function updateButton(){
			var left = items.filter('[data-cat="' + current + '"].is-collapsed').length;
			$more.toggle(left > 0).find('.count').text(left);
		}

		function show(cat, animate){
			current = cat;
			var n = 0;
			items.each(function(){
				var li = $(this), inTab = (li.data('cat') === cat);
				li.toggleClass('is-hidden', !inTab).removeClass('is-shown');
				if(inTab){
					n++;
					li.toggleClass('is-collapsed', n > PAGE);
					if(animate && n <= PAGE){ fadeIn(li); }
				}else{
					li.removeClass('is-collapsed');
				}
			});
			updateButton();
		}

		$more.find('button').on('click', function(){
			items.filter('[data-cat="' + current + '"].is-collapsed').slice(0, PAGE).each(function(){
				var li = $(this).removeClass('is-collapsed');
				fadeIn(li);
			});
			updateButton();
		});

		filter.find('.tab_header a').on('click', function(){
			show($(this).data('filter'), true);
			return false;
		});

		// on load, show only the tab marked active in the HTML (Posters)
		show(filter.find('.tab_header li.active a').data('filter'), false);
	}

	/* Modal Prev / Next: only step through items visible under the active
	   filter. init.js moves data-index by ±1 (wrapping at data-count), so
	   before its handler runs we set data-index next to the wanted item. */
	function modalNavFollowsFilter(){
		document.addEventListener('click', function(e){
			var link = e.target.closest('.resumo_fn_modalbox .fn__nav a');
			if(!link){ return; }
			var nav		= link.closest('.fn__nav');
			if(nav.getAttribute('data-from') !== 'portfolio'){ return; }
			var current	= parseInt(nav.getAttribute('data-index'), 10);
			var visible	= $('#portfolio .resumo_fn_portfolio_grid > ul > li:not(.is-hidden) .modal_item')
				.map(function(){ return parseInt(this.getAttribute('data-index'), 10); }).get()
				.sort(function(a, b){ return a - b; });
			if(visible.length < 2){ return; }
			var pos		= visible.indexOf(current);
			var isNext	= link.classList.contains('next');
			var target	= isNext
				? visible[(pos + 1) % visible.length]
				: visible[(pos - 1 + visible.length) % visible.length];
			nav.setAttribute('data-index', isNext ? target - 1 : target + 1);
			preloadNeighbours(target);
		}, true);	// capture phase: runs before init.js's handler on the link

		// opening an item from the grid also warms up its neighbours
		// (bound on the item itself: init.js's handler returns false, so the click never bubbles)
		$('#portfolio .modal_item').on('click', function(){
			preloadNeighbours(parseInt(this.getAttribute('data-index'), 10));
		});
	}

	/* Fetch the full-size images of the previous and next visible items in
	   the background, so Prev / Next shows them without waiting. Posters
	   have one image; for Behance projects the first two are enough. */
	var preloaded = {};
	function preloadNeighbours(index){
		var visible = $('#portfolio .resumo_fn_portfolio_grid > ul > li:not(.is-hidden) .modal_item')
			.map(function(){ return parseInt(this.getAttribute('data-index'), 10); }).get()
			.sort(function(a, b){ return a - b; });
		var pos = visible.indexOf(index);
		if(pos < 0 || visible.length < 2){ return; }
		var neighbours = [visible[(pos + 1) % visible.length], visible[(pos - 1 + visible.length) % visible.length]];
		$.each(neighbours, function(i, n){
			$('#portfolio .modal_item[data-index="' + n + '"] .fn__hidden img').slice(0, 2).each(function(){
				var src = this.getAttribute('src');
				if(src && !preloaded[src]){
					preloaded[src] = true;
					(new Image()).src = src;
				}
			});
		});
	}

	/* Lightbox for posters and Motion videos.
	   Click a card: its cover grows from the grid position to the centre of
	   the screen (FLIP animation), the page behind blurs and darkens to 70%
	   black, and round arrows sit at the sides. For videos
	   (data-type="video" data-vimeo="ID") the Vimeo player then fades in
	   over the cover and plays; it is removed again on close / next, which
	   stops playback. Closing shrinks the cover back into its card.
	   Keys: ← → to browse, Esc to close; swipe on touch. */
	function posterLightbox(){
		var EASE_MS	= 550;
		var $box	= $(
			'<div class="fn_lightbox" role="dialog" aria-modal="true" aria-label="Viewer" aria-hidden="true">' +
				'<div class="fn_lb_backdrop"></div>' +
				'<img class="fn_lb_img" alt="" />' +
				'<div class="fn_lb_ui">' +
					'<p class="fn_lb_caption"><span class="fn_lb_title"></span><span class="fn_lb_count"></span></p>' +
					'<button type="button" class="fn_lb_arrow fn_lb_prev" aria-label="Previous">' +
						'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
					'<button type="button" class="fn_lb_arrow fn_lb_next" aria-label="Next">' +
						'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
					'<button type="button" class="fn_lb_close" aria-label="Close"><span></span></button>' +
				'</div>' +
			'</div>'
		).appendTo('body');
		var box		= $box[0];
		var img		= $box.find('.fn_lb_img')[0];
		var $prev	= $box.find('.fn_lb_prev'), $next = $box.find('.fn_lb_next');
		var list	= [], pos = 0, busy = false, lastFocus = null;
		var frame	= null;	// the Vimeo <iframe> while a video is showing

		function isVideo(item){ return item.getAttribute('data-type') === 'video'; }

		// Vimeo player on top of the cover; fades in once it has loaded
		function mountVideo(item){
			unmountVideo();
			var id = item.getAttribute('data-vimeo');
			frame = document.createElement('iframe');
			frame.className = 'fn_lb_video';
			frame.src = 'https://player.vimeo.com/video/' + id +
				'?autoplay=1&color=e5540a&title=0&byline=0&portrait=0&dnt=1';
			frame.title = item.getAttribute('data-title');
			frame.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
			frame.setAttribute('allowfullscreen', '');
			$(frame).css({ left: img.style.left, top: img.style.top, width: img.style.width, height: img.style.height });
			frame.onload = function(){ $(this).addClass('is-ready'); };
			// The page can't see the mouse inside Vimeo's (cross-origin) frame,
			// so the magic cursor would freeze at its edge: hide it while the
			// pointer is over the video; Vimeo shows its own cursor there.
			frame.addEventListener('mouseenter', function(){ $('.frenify-cursor').addClass('is-off'); });
			frame.addEventListener('mouseleave', function(){ $('.frenify-cursor').removeClass('is-off'); });
			box.appendChild(frame);
		}
		function unmountVideo(){
			if(frame){ frame.remove(); frame = null; }
			$('.frenify-cursor').removeClass('is-off');
		}

		function visibleItems(){
			return $('#portfolio .resumo_fn_portfolio_grid > ul > li:not(.is-hidden) .lb_item').get();
		}
		function thumbOf(item){ return item.querySelector('.img_holder img'); }

		// where the poster sits when fully open (also places arrows + caption)
		function layout(item){
			var w = +item.getAttribute('data-width'), h = +item.getAttribute('data-height');
			var vw = window.innerWidth, vh = window.innerHeight;
			var small	= vw < 768;
			var arrow	= small ? 44 : 56, gap = small ? 10 : 28;
			var side	= small ? 16 : arrow + gap + 24;
			var top		= small ? 70 : 60, bottom = small ? 120 : 90;
			var s		= Math.min((vw - side * 2) / w, (vh - top - bottom) / h);
			var W = Math.round(w * s), H = Math.round(h * s);
			var L = Math.round((vw - W) / 2), T = Math.round(top + (vh - top - bottom - H) / 2);
			$(img).css({ left: L, top: T, width: W, height: H });
			if(frame){ $(frame).css({ left: L, top: T, width: W, height: H }); }
			if(small){
				// phones: arrows sit under the poster, beside the caption
				$prev.css({ left: L, top: T + H + 16 });
				$next.css({ left: L + W - arrow, top: T + H + 16 });
			}else{
				$prev.css({ left: L - gap - arrow, top: T + (H - arrow) / 2 });
				$next.css({ left: L + W + gap, top: T + (H - arrow) / 2 });
			}
			$box.find('.fn_lb_caption').css({ top: T + H + (small ? 26 : 22) });
			return { left: L, top: T, width: W, height: H };
		}

		// transform that makes the open poster cover its grid card
		function toCard(item, rect){
			var r = thumbOf(item).closest('.img_holder').getBoundingClientRect();
			var s = Math.max(r.width / rect.width, r.height / rect.height);
			var x = r.left + r.width / 2 - (rect.width * s) / 2;
			var y = r.top + r.height / 2 - (rect.height * s) / 2;
			return 'translate(' + (x - rect.left) + 'px,' + (y - rect.top) + 'px) scale(' + s + ')';
		}

		function caption(){
			var item = list[pos];
			$box.find('.fn_lb_title').text(item.getAttribute('data-title'));
			$box.find('.fn_lb_count').text((pos + 1) + ' / ' + list.length);
			$prev.add($next).toggle(list.length > 1);
		}

		// show the cached thumbnail at once, then swap in the full-size file
		function setSource(item){
			var thumb	= thumbOf(item);
			var full	= item.getAttribute('data-full');
			img.alt		= thumb.alt;
			img.src		= thumb.currentSrc || thumb.src;
			var hi		= new Image();
			hi.onload	= function(){ if(list[pos] === item){ img.src = full; } };
			hi.src		= full;
		}

		function preload(){
			$.each([1, -1], function(i, d){
				var item = list[(pos + d + list.length) % list.length];
				if(item){ (new Image()).src = item.getAttribute('data-full'); }
			});
		}

		function open(item){
			if(busy){ return; }
			list = visibleItems(); pos = list.indexOf(item);
			if(pos < 0){ return; }
			busy = true; lastFocus = document.activeElement;
			setSource(item);
			var rect = layout(item);
			caption();
			$(img).removeClass('is-animating').css({ transform: toCard(item, rect), opacity: 1 });
			$('html').addClass('fn_lb_lock');
			$box.addClass('is-open').attr('aria-hidden', 'false');
			void img.offsetWidth;	// commit the start position before animating
			$(img).addClass('is-animating').css('transform', 'none');
			$box.addClass('is-active');
			setTimeout(function(){
				busy = false;
				$box.find('.fn_lb_close').trigger('focus');
				if(isVideo(item) && list[pos] === item){ mountVideo(item); }
			}, EASE_MS);
			preload();
		}

		function close(){
			if(busy || !$box.hasClass('is-open')){ return; }
			busy = true;
			unmountVideo();	// stops playback; the cover shrinks back
			var item = list[pos];
			var rect = img.getBoundingClientRect();
			var card = thumbOf(item).closest('.img_holder').getBoundingClientRect();
			var onScreen = card.width > 0 && card.bottom > 0 && card.top < window.innerHeight;
			$box.removeClass('is-active');
			if(onScreen){
				$(img).addClass('is-animating').css('transform', toCard(item, rect));
			}else{
				// card is behind "Show more" or scrolled away: fade out in place
				// (origin is top-left, so shift 4% to keep the shrink centred)
				$(img).addClass('is-animating').css({ transform: 'translate(4%, 4%) scale(.92)', opacity: 0 });
			}
			setTimeout(function(){
				$box.removeClass('is-open').attr('aria-hidden', 'true');
				$(img).removeClass('is-animating').css({ transform: '', opacity: '' });
				$('html').removeClass('fn_lb_lock');
				busy = false;
				if(lastFocus){ lastFocus.focus({ preventScroll: true }); }
			}, EASE_MS);
		}

		// slide the current poster out and the next one in
		function go(dir){
			if(busy || list.length < 2){ return; }
			busy = true;
			unmountVideo();
			$(img).addClass('is-animating').css({ transform: 'translateX(' + (-40 * dir) + 'px)', opacity: 0 });
			setTimeout(function(){
				pos = (pos + dir + list.length) % list.length;
				var item = list[pos];
				$(img).removeClass('is-animating').css({ transform: 'translateX(' + (40 * dir) + 'px)', opacity: 0 });
				setSource(item);
				layout(item);
				caption();
				void img.offsetWidth;
				$(img).addClass('is-animating').css({ transform: 'none', opacity: 1 });
				setTimeout(function(){
					busy = false;
					if(isVideo(item) && list[pos] === item){ mountVideo(item); }
				}, 260);
				preload();
			}, 200);
		}

		// grid cards: click / Enter / Space opens; magic cursor grows on hover
		$('#portfolio .lb_item').each(function(){
			this.setAttribute('tabindex', '0');
			this.setAttribute('role', 'button');
			this.setAttribute('aria-label', (isVideo(this) ? 'Play video: ' : 'Open poster: ') + this.getAttribute('data-title'));
		}).on('click', function(){
			open(this);
		}).on('keydown', function(e){
			if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(this); }
		}).on('mouseenter', function(){
			$('.cursor-inner, .cursor-outer').addClass('cursor-hover');
		}).on('mouseleave', function(){
			$('.cursor-inner, .cursor-outer').removeClass('cursor-hover');
		});

		$prev.on('click', function(){ go(-1); });
		$next.on('click', function(){ go(1); });
		$box.find('.fn_lb_close, .fn_lb_backdrop').on('click', close);

		$(document).on('keydown', function(e){
			if(!$box.hasClass('is-open')){ return; }
			if(e.key === 'Escape'){ close(); }
			else if(e.key === 'ArrowRight'){ go(1); }
			else if(e.key === 'ArrowLeft'){ go(-1); }
		});

		var touchX = null;
		box.addEventListener('touchstart', function(e){ touchX = e.touches[0].clientX; }, { passive: true });
		box.addEventListener('touchend', function(e){
			if(touchX === null){ return; }
			var dx = e.changedTouches[0].clientX - touchX; touchX = null;
			if(Math.abs(dx) > 50){ go(dx < 0 ? 1 : -1); }
		});

		$(window).on('resize', function(){ if($box.hasClass('is-open')){ layout(list[pos]); } });
	}

	/* Motion covers: ask Vimeo (public oEmbed, no key needed) for each
	   video's current thumbnail, so a cover changed in Vimeo shows up here
	   without editing the HTML. The URL already in the HTML is the fallback. */
	function refreshVimeoCovers(){
		$('#portfolio .lb_item[data-vimeo]').each(function(){
			var item	= this;
			var id		= item.getAttribute('data-vimeo');
			$.getJSON('https://vimeo.com/api/oembed.json?width=960&url=' + encodeURIComponent('https://vimeo.com/' + id))
				.done(function(data){
					if(!data || !data.thumbnail_url){ return; }
					var full = data.thumbnail_url;	// ends in -d_960
					item.setAttribute('data-full', full);
					item.querySelector('.img_holder img').src = full.replace(/-d_\d+(x\d+)?/, '-d_640');
				});
		});
	}

	/* Phones: tab rows scroll sideways when they don't fit (css/custom.css);
	   keep the tapped tab fully in view. Horizontal only, so the page
	   itself never jumps. */
	function tabsKeepActiveInView(){
		$('.resumo_fn_tabs .tab_header a').on('click', function(){
			var li = this.parentNode, ul = li.parentNode;
			if(ul.scrollWidth <= ul.clientWidth){ return; }
			var left = li.offsetLeft - ul.offsetLeft, right = left + li.offsetWidth;
			if(left < ul.scrollLeft){ ul.scrollTo({ left: left, behavior: 'smooth' }); }
			else if(right > ul.scrollLeft + ul.clientWidth){ ul.scrollTo({ left: right - ul.clientWidth, behavior: 'smooth' }); }
		});
	}

	$(function(){
		tabsKeepActiveInView();
		portfolioFilter();
		modalNavFollowsFilter();
		posterLightbox();
		refreshVimeoCovers();
	});

})(jQuery);
