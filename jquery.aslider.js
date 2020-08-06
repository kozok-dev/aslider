/*
aslider 1.0.0
(c)2014 aslider team
Released under the MIT license
*/
(function ($) {
$.fn.extend({
aslider: function (option) {
	var el = $(this).eq(0);

	var el_func = el.data("el_func");
	if (el_func != null) {
		// 生成済みなのでそれを再利用する
		el_func.option = $.extend(el_func.option, option);
		el_func.init();
		return el_func;
	}

	var elcc, elcc_cnt;
	var elc_pos = 0, elc_width, elc_height;
	var el_timer = null;

	if (el.css("position") == "static") el.css("position", "relative");
	el.css("overflow", "hidden");
	el.children().eq(0).css("position", "absolute");

	// 外部から呼び出し可能メソッド等の宣言
	el_func = {
		// オプション
		option: {
			vertical: false	// アニメーションの方向は縦か
			, offset: {left: 0.5, top: 0.5}	// スライド枠からの位置オフセット
			, elem_offset: {left: -0.5, top: -0.5}	// 各要素からの位置オフセット
			, move_minimum: false	// 移動量を最小にするか
			, moveBefore: function () {}	// アニメーション前に実行
			, moveStep: function (t) {}	// アニメーション中の毎フレーム実行
			, moveAfter: function (succ) {}	// アニメーション後に実行(succ:正常終了ならtrue、それ以外はfalse)
		}

		// 初期化
		, init: function () {
			el.children().eq(0).children("[data-clone=1]").remove();
			elcc = el.children().eq(0).children(":visible");
			elcc_cnt = elcc.length;

			// 要素がサイズ内に収まらないならループできるようにコピーを生成
			// 要素がサイズ内に収まるならコピーは生成せず、アニメーションさせないようにする
			if (this.option.vertical) {	// 縦？
				elc_width = el.children().eq(0).outerWidth(true);
				elc_height = 0;

				// 要素の合計高さを計算
				elcc.each(function () {
					elc_height += $(this).outerHeight(true);
				});

				if (el.height() <= elc_height) {
					el.children().eq(0).height(elc_height * 2).append(elcc.clone(true).attr("data-clone", "1"));
					elcc = el.children().eq(0).children(":visible");	// 再設定
				} else {
					el.children().eq(0).height(elc_height).css({
						left: elc_width * this.option.elem_offset.left + el.width() * this.option.offset.left
						, top: elc_height * this.option.elem_offset.top + el.height() * this.option.offset.top
					});
					elcc_cnt = 0;
				}

			} else {	// 横
				elc_width = 0;
				elc_height = el.children().eq(0).outerHeight(true);

				// 要素の合計幅を計算
				elcc.each(function () {
					elc_width += $(this).outerWidth(true);
				});

				if (el.width() <= elc_width) {
					el.children().eq(0).width(elc_width * 2).append(elcc.clone(true).attr("data-clone", "1"));
					elcc = el.children().eq(0).children(":visible");	// 再設定
				} else {
					el.children().eq(0).width(elc_width).css({
						left: elc_width * this.option.elem_offset.left + el.width() * this.option.offset.left
						, top: elc_height * this.option.elem_offset.top + el.height() * this.option.offset.top
					});
					elcc_cnt = 0;
				}
			}

			setPos(elc_pos);
		}

		// 要素の移動
		, move: function (move_pos, duration, easing) {
			if (elcc_cnt == 0 || !$.isNumeric(move_pos)) return 0;
			this.stop();

			if (this.option.move_minimum) move_pos %= elcc_cnt;

			// easingの設定
			easing = $.easing[(easing in $.easing) && easing || easing == null && (duration in $.easing) && !(duration in $.fx.speeds) && duration || "swing"];

			// durationの設定
			if (move_pos == 0) {
				duration = 1;
			} else if ($.isNumeric(duration)) {
				if (duration <= 0) duration = 1;
			} else {
				duration = $.fx.speeds[(duration in $.fx.speeds) && duration || "_default"];
			}

			var base_pos = elc_pos;	// アニメーション前の現在位置を設定
			var self = this;
			var time = null, start_time;

			// アニメーション
			this.option.moveBefore();
			step();
			return move_pos;
			function step() {
				time = time == null ? (duration > 1 ? 0 : 1) : time + (new Date().getTime() - start_time);
				start_time = new Date().getTime();
				if (time < 0 || time > duration) time = duration;

				var t = time / duration;
				if (setPos(base_pos + move_pos * easing(t, time, 0, 1, duration))) {
					self.option.moveStep(t);
				} else {
					time = duration;
				}

				if (time < duration) {
					el_timer = setTimeout(step, $.fx.interval);
				} else {
					self.stop();
					self.option.moveAfter(time == duration);
				}
			}
		}

		// 指定した要素インデックスindexへ移動する
		, moveByIndex: function (index, duration, easing) {
			if (index < 0) return 0;
			return this.move(getPosDiff(index), duration, easing);
		}

		// 指定した要素へ移動する
		, moveByElem: function (elem, duration, easing) {
			var index = elcc.index(elem);
			if (index < 0) return 0;
			return this.move(getPosDiff(index), duration, easing);
		}

		// スライドアニメーション
		, slide: function (duration) {
			if (elcc_cnt == 0 || !$.isNumeric(duration) || duration == 0) return;
			this.stop();

			var base_pos = elc_pos;	// アニメーション前の現在位置を設定
			var self = this;
			var time = null, start_time;

			// アニメーション
			this.option.moveBefore();
			step();
			function step() {
				time = time == null ? 0 : time + (new Date().getTime() - start_time);
				start_time = new Date().getTime();

				if (setPos(base_pos + time / duration)) {
					self.option.moveStep(toPos(elc_pos).point);
					el_timer = setTimeout(step, $.fx.interval);
				} else {
					self.stop();
				}
			}
		}

		// アニメーション停止
		, stop: function () {
			if (el_timer == null) return;
			clearTimeout(el_timer);
			el_timer = null;
		}

		// アニメーション中かどうか
		, isAnim: function () {
			return el_timer != null;
		}

		// 要素数を取得
		, count: function () {
			return elcc_cnt;
		}

		// 現在位置を取得
		, getPos: function (offset) {
			return toPos(elc_pos + ($.isNumeric(offset) ? offset : 0));
		}
	};

	el_func.option = $.extend(el_func.option, option);
	el_func.init();

	el.data("el_func", el_func);
	return el_func;

	//----------

	// 位置設定
	//  位置の管理方法は要素のピクセル位置等ではなく、0から始まる要素インデックスとなる
	//  つまり、0であれば0番目の要素の位置ということになる
	//  そして、1.5とすると1番目の要素と2番目の要素の丁度真ん中の位置ということになり、
	//  0.1とすると0番目の要素から1番目の要素までの位置を0.1倍した位置ということになる
	function setPos(pos) {
		if (elcc_cnt == 0) return false;

		// 位置を決める基準を設定
		pos %= elcc_cnt;
		var from_pos = toPos(pos);
		var to_pos = toPos(pos + 1);
		var from = elcc.eq(from_pos.index);
		var to = elcc.eq(to_pos.index);

		elc_pos = from_pos.index + from_pos.point;	// 現在位置を設定

		// leftのピクセル位置を計算
		var left = -calcProg(
			from.position().left - from.outerWidth(true) * el_func.option.elem_offset.left - el.width() * el_func.option.offset.left + (el_func.option.vertical ? 0 : from_pos.over * elc_width)
			, to.position().left - to.outerWidth(true) * el_func.option.elem_offset.left - el.width() * el_func.option.offset.left + (el_func.option.vertical ? 0 : to_pos.over * elc_width)
			, from_pos.point
		);
		if (!el_func.option.vertical) {
			if (left > elc_width) {
				left -= elc_width * 2;
			} else if (left > 0) {
				left -= elc_width;
			} else if (left + elc_width * 2 < el.width()) {
				left += elc_width;
			}
		}

		// topのピクセル位置を計算
		var top = -calcProg(
			from.position().top - from.outerHeight(true) * el_func.option.elem_offset.top - el.height() * el_func.option.offset.top + (el_func.option.vertical ? from_pos.over * elc_height : 0)
			, to.position().top - to.outerHeight(true) * el_func.option.elem_offset.top - el.height() * el_func.option.offset.top + (el_func.option.vertical ? to_pos.over * elc_height : 0)
			, from_pos.point
		);
		if (el_func.option.vertical) {
			if (top > elc_height) {
				top -= elc_height * 2;
			} else if (top > 0) {
				top -= elc_height;
			} else if (top + elc_height * 2 < el.height()) {
				top += elc_height;
			}
		}

		el.children().eq(0).css({left: left, top: top});
		return true;
	}

	// 引数posを適切な位置情報に変換してそれを取得
	function toPos(pos) {
		if (elcc_cnt == 0) return {index: 0, point: 0, over: 0};

		// 精度調整
		var float = modf(pos);
		pos = float.int + (pos < 0 ? -float.point : float.point);

		var index = Math.floor(pos);
		if (pos < 0) {
			return {
				index: (elcc_cnt + index % elcc_cnt) % elcc_cnt
				, point: pos - index
				, over: -1
			};
		} else {
			return {
				index: index % elcc_cnt
				, point: pos - index
				, over: index < elcc_cnt ? 0 : 1
			};
		}
	}

	// 現在位置までの差の少ない方を返す
	function getPosDiff(index) {
		if (elcc_cnt == 0) return 0;

		var diff1 = toPos(index % elcc_cnt - elc_pos);
		diff1 = diff1.index + diff1.point;

		var diff2 = toPos(elc_pos - index % elcc_cnt);
		diff2 = -(diff2.index + diff2.point);

		var diff1_abs = Math.abs(diff1);
		var diff2_abs = Math.abs(diff2);

		if (diff1_abs == diff2_abs) {
			return index < elcc_cnt ? diff2 : diff1;
		} else {
			return diff1_abs > diff2_abs ? diff2 : diff1;
		}
	}

	// 整数部と小数部を返す
	function modf(val) {
		var int = val < 0 ? Math.ceil(val) : Math.floor(val);

		// 精度調整
		var point = Math.abs(val - int);
		if (point < 0.0000000001) {
			point = 0;
		} else if (point > 0.9999999999) {
			int += val < 0 ? -1 : 1;
			point = 0;
		}

		return {int: int, point: point};
	}

	// 進行度計算
	function calcProg(s, e, t) {
		return (e - s) * t + s;
	}
}
});
})(jQuery);