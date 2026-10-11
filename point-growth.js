"use strict";

/**
 * 只管理“本帧显示多少点”，不生成坐标，不操作 WebGL 或页面控件。
 * 按时间累计，而非每帧固定加点。暂停保留进度；重播不重新随机取点。
 * @param {{onUpdate: Function, onError: Function, rate?: number}} options
 * @returns {{reset: Function, start: Function, pause: Function, restart: Function,
 *            getState: Function, dispose: Function}}
 */
function createPointGrowth({ onUpdate, onError, rate = 500 }) {
    if (typeof onUpdate !== "function" || typeof onError !== "function" ||
        !Number.isFinite(rate) || rate <= 0) {
        throw new TypeError("动画需要有效回调与正的生长速度。");
    }
    let total = 0;
    let progress = 0; // 保留小数，避免每帧取整丢失进度。
    let running = false;
    let frameId = null;
    let lastTime = null;
    let disposed = false;

    function getState() {
        const count = Math.min(total, Math.floor(progress + 1e-9));
        return { total, count, running, completed: total > 0 && count === total, rate };
    }
    function stopFrame() {
        if (frameId !== null) window.cancelAnimationFrame(frameId);
        frameId = null;
        lastTime = null;
    }
    function publish() {
        try { onUpdate(getState()); }
        catch (error) {
            running = false;
            stopFrame();
            onError(error);
        }
    }
    function schedule() {
        if (running && !disposed && frameId === null) {
            frameId = window.requestAnimationFrame(step);
        }
    }
    function step(timestamp) {
        frameId = null;
        if (!running || disposed) return;
        if (lastTime !== null) {
            const deltaSeconds = Math.max(0, timestamp - lastTime) / 1000;
            progress = Math.min(total, progress + rate * deltaSeconds);
        }
        lastTime = timestamp;
        if (getState().count >= total) {
            progress = total;
            running = false;
            lastTime = null;
        }
        publish();
        schedule();
    }
    function reset(nextTotal) {
        if (!Number.isInteger(nextTotal) || nextTotal < 0) {
            throw new RangeError("动画目标必须是非负整数。");
        }
        if (disposed) return;
        running = false;
        stopFrame();
        total = nextTotal;
        progress = 0;
        publish(); // 第一幅画面为 0 个点。
    }
    function start() {
        if (disposed || running || total === 0 || getState().completed) return;
        running = true;
        lastTime = null; // 恢复时不计算暂停期间的时间。
        publish();
        schedule();
    }
    function pause(notify = true) {
        running = false;
        stopFrame();
        if (notify && !disposed) publish();
    }
    function restart() {
        reset(total);
        start();
    }
    function dispose() {
        disposed = true;
        pause(false);
    }
    return { reset, start, pause, restart, getState, dispose };
}
