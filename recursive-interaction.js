"use strict";

/**
 * 自行处理鼠标/键盘，不生成几何、不直接调用 WebGL。
 * 显示坐标 = 原坐标 * scale + translation。
 * 回调收到的是快照；缩放上下限 0.25～20 是本项目的交互设计取值。
 * @param {HTMLCanvasElement} canvas
 * @param {{onViewChange: Function, onModeChange: Function, onError: Function, onToggleGrowth?: Function}} callbacks
 * @returns {{reset: Function, getView: Function, dispose: Function}}
 */
function createCanvasInteractions(canvas, { onViewChange, onModeChange, onError, onToggleGrowth = () => false }) {
    if (!(canvas instanceof HTMLCanvasElement) ||
        ![onViewChange, onModeChange, onError, onToggleGrowth].every(fn => typeof fn === "function")) {
        throw new TypeError("交互模块需要有效画布与回调函数。");
    }
    let scale = 1;
    let translation = [0, 0];
    let dragging = false;
    let lastPoint = null;
    const removeListeners = [];
    const modes = { "1": "points", "2": "lines", "3": "triangles" };

    function getView() {
        return { scale, translation: [...translation] };
    }
    function stopDrag() {
        dragging = false;
        lastPoint = null;
        canvas.classList.remove("is-dragging");
    }
    function listen(target, name, handler, options) {
        // 事件中的错误交给 UI 显示，不让拖动状态卡住。
        const guarded = event => {
            try { handler(event); }
            catch (error) { stopDrag(); onError(error); }
        };
        target.addEventListener(name, guarded, options);
        removeListeners.push(() => target.removeEventListener(name, guarded, options));
    }

    // 本页画布 padding=0、无 CSS transform；扣除边框后获得实际显示区域。
    function getCanvasArea() {
        const rect = canvas.getBoundingClientRect();
        const style = getComputedStyle(canvas);
        const leftBorder = parseFloat(style.borderLeftWidth) || 0;
        const rightBorder = parseFloat(style.borderRightWidth) || 0;
        const topBorder = parseFloat(style.borderTopWidth) || 0;
        const bottomBorder = parseFloat(style.borderBottomWidth) || 0;
        const width = rect.width - leftBorder - rightBorder;
        const height = rect.height - topBorder - bottomBorder;
        if (width <= 0 || height <= 0) throw new Error("画布显示尺寸无效。");
        return { left: rect.left + leftBorder, top: rect.top + topBorder, width, height };
    }
    function toCanvasCoordinates(event, area) {
        // 浏览器 y 向下增大；本例显示坐标 y 向上增大，所以翻转 y。
        return [
            2 * (event.clientX - area.left) / area.width - 1,
            1 - 2 * (event.clientY - area.top) / area.height
        ];
    }

    listen(canvas, "mousedown", event => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey) return;
        event.preventDefault();
        canvas.focus({ preventScroll: true });
        dragging = true;
        lastPoint = toCanvasCoordinates(event, getCanvasArea());
        canvas.classList.add("is-dragging");
    });
    // 在 window 上监听移动/松开：拖出画布后松手也能结束拖动。
    listen(window, "mousemove", event => {
        if (!dragging) return;
        if ((event.buttons & 1) === 0) { stopDrag(); return; }
        const point = toCanvasCoordinates(event, getCanvasArea());
        translation[0] += point[0] - lastPoint[0];
        translation[1] += point[1] - lastPoint[1];
        lastPoint = point;
        onViewChange(getView());
    });
    listen(window, "mouseup", event => {
        if ((event.buttons & 1) === 0) stopDrag();
    });
    listen(window, "blur", stopDrag);
    listen(document, "visibilitychange", () => { if (document.hidden) stopDrag(); });

    listen(canvas, "wheel", event => {
        // 不接管 Ctrl/Command 组合滚轮，保留浏览器缩放；普通滚轮用于图形缩放。
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
            !Number.isFinite(event.deltaY) || event.deltaY === 0) return;
        const area = getCanvasArea();
        // deltaMode: 0=像素，1=行，2=页；16 是本项目采用的行滚动换算值。
        const units = [1, 16, area.height];
        if (units[event.deltaMode] === undefined) return;
        event.preventDefault();
        stopDrag();
        const delta = Math.max(-1000, Math.min(1000, event.deltaY * units[event.deltaMode]));
        const nextScale = Math.max(0.25, Math.min(20, scale * Math.exp(-delta * 0.0015)));
        if (nextScale === scale) return;
        const cursor = toCanvasCoordinates(event, area);
        // 先反算鼠标下的原始坐标，再更新平移，让该点缩放后仍留在鼠标下方。
        const anchor = [
            (cursor[0] - translation[0]) / scale,
            (cursor[1] - translation[1]) / scale
        ];
        translation = [
            cursor[0] - anchor[0] * nextScale,
            cursor[1] - anchor[1] * nextScale
        ];
        scale = nextScale;
        onViewChange(getView());
    }, { passive: false });

    listen(window, "keydown", event => {
        if (event.defaultPrevented || event.isComposing || event.repeat ||
            event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
        const target = event.target;
        // 焦点在控件或可编辑文字中时，不抢走数字输入/控件自身的键盘操作。
        if (target instanceof Element &&
            (target.isContentEditable || target.closest("input,select,textarea,button"))) return;
        if (event.code === "Space" || event.key === " ") {
            // 只在 UI 实际处理点云动画时，阻止空格触发页面滚动。
            if (onToggleGrowth()) event.preventDefault();
            return;
        }
        if (!Object.prototype.hasOwnProperty.call(modes, event.key)) return;
        event.preventDefault();
        onModeChange(modes[event.key]);
    });

    function reset() {
        stopDrag();
        scale = 1;
        translation = [0, 0];
        try { onViewChange(getView()); }
        catch (error) { onError(error); }
    }
    function dispose() {
        stopDrag();
        for (const remove of removeListeners) remove();
        removeListeners.length = 0;
    }
    return { reset, getView, dispose };
}
