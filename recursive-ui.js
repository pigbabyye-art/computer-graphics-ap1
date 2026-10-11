"use strict";

// 统一页面：两种算法、三种图元、显示参数、视图交互与点云动画。
// geometry.js 生成数据；renderer 负责绘制；growth 只计算当前可见点数。
window.addEventListener("load", function () {
    const status = document.getElementById("status");
    let growth = null;
    let interactions = null;
    let failed = false;
    function reportError(error) {
        failed = true;
        if (growth) growth.pause(false); // 避免错误回调再次触发绘图。
        console.error(error);
        if (status) status.textContent = "运行失败：" + error.message;
    }

    try {
        const controls = {};
        const ids = ["render-mode", "recursion-depth", "point-size", "point-size-value",
            "point-size-hint", "color-scheme", "reset-view", "view-status", "gl-canvas",
            "generation-method", "point-count", "apply-point-count", "toggle-growth",
            "restart-growth", "growth-progress", "growth-status", "algorithm-hint"];
        for (const id of ids) {
            controls[id] = document.getElementById(id);
            if (!controls[id]) throw new Error("页面缺少控件：" + id + "。请同步所有更新文件。");
        }
        if (!status || typeof subdivide !== "function" ||
            typeof generateChaosPoints !== "function" ||
            typeof buildRecursiveRenderData !== "function" ||
            typeof createRecursiveRenderer !== "function" ||
            typeof createCanvasInteractions !== "function" || typeof createPointGrowth !== "function") {
            throw new Error("算法或配套脚本未加载，请检查文件同步与引用路径。");
        }
        const canvas = controls["gl-canvas"];
        const methodControl = controls["generation-method"];
        const modeControl = controls["render-mode"];
        const depthControl = controls["recursion-depth"];
        const sizeControl = controls["point-size"];
        const countControl = controls["point-count"];
        const colorControl = controls["color-scheme"];
        const renderer = createRecursiveRenderer(canvas);
        const vertices = [[-0.9, -0.9], [0.9, -0.9], [0, 0.9]];
        const modeNames = { points: "点云", lines: "线框", triangles: "实体" };
        const palettes = {
            blue: { name: "蓝白", color: [0.1, 0.5, 0.9, 1], background: [1, 1, 1, 1] },
            ember: { name: "橙黑", color: [1, 0.65, 0.22, 1], background: [0.07, 0.08, 0.11, 1] },
            purple: { name: "紫米白", color: [0.47, 0.19, 0.67, 1], background: [0.99, 0.97, 0.92, 1] }
        };
        const [deviceMin, deviceMax] = renderer.pointSizeRange;
        const pointMin = Math.max(1, deviceMin);
        const pointMax = Math.max(pointMin, Math.min(12, deviceMax));
        sizeControl.min = String(pointMin);
        sizeControl.max = String(pointMax);
        sizeControl.value = String(Math.min(pointMax, Math.max(pointMin, 4)));

        let view = { scale: 1, translation: [0, 0] };
        let recursiveCache = null;
        let chaosCache = null;
        let active = null;

        function drawCurrentMode(log = false) {
            if (!active || failed) return;
            const mode = modeControl.value;
            const isPoints = mode === "points";
            const isChaos = active.method === "chaos";
            const palette = palettes[colorControl.value];
            const data = active.data[mode];
            if (!palette || !data) throw new Error("算法、模式或配色组合无效。");
            const size = Number(sizeControl.value);
            if (!Number.isFinite(size) || size < pointMin || size > pointMax) {
                throw new RangeError("点大小超出设备支持的滑条范围。");
            }
            const animation = growth.getState();
            const visibleCount = isPoints ? animation.count : data.length / 2;
            const drawn = renderer.draw(data, mode, {
                pointSize: size, color: palette.color, background: palette.background,
                scale: view.scale, translation: view.translation, count: visibleCount
            });
            depthControl.disabled = isChaos;
            countControl.disabled = !isChaos;
            controls["apply-point-count"].disabled = !isChaos;
            sizeControl.disabled = !isPoints || pointMin === pointMax;
            controls["point-size-value"].textContent = String(size);
            controls["point-size-hint"].textContent = isPoints
                ? "点大小只改变点的显示尺寸；拖动、缩放、换色不会重新生成点。"
                : "点大小只影响点云；线框与实体直接显示全部几何。";
            controls["algorithm-hint"].textContent = isChaos
                ? "混沌游戏仅画点云；选择线框/实体（或按 2/3）会明确切换为递归细分。目标点数限 5000～50000。"
                : "递归细分的同一组三角形支持三种模式。此点云是三角形顶点，不是随机的 5000 点。";
            const geometryInfo = isChaos
                ? `算法：混沌游戏｜目标点数：${active.count}`
                : `算法：递归细分｜深度：${active.depth}｜小三角形：${active.triangleCount}`;
            status.textContent = geometryInfo + `｜模式：${modeNames[mode]}` +
                `｜提交顶点记录数：${drawn}｜配色：${palette.name}`;
            controls["view-status"].textContent = `缩放：${view.scale.toFixed(2)}×` +
                `｜平移：(${view.translation[0].toFixed(3)}, ${view.translation[1].toFixed(3)})`;
            controls["growth-progress"].max = Math.max(1, animation.total);
            controls["growth-progress"].value = animation.count;
            const playback = animation.completed ? "已完成" : animation.running ? "播放中" : "已暂停";
            controls["growth-status"].textContent = isPoints
                ? `${playback}｜已显示：${animation.count} / ${animation.total}｜速度：${animation.rate} 点/秒`
                : "动画仅在点云模式可用；切回点云继续播放，保留当前数据的进度。";
            controls["toggle-growth"].disabled = !isPoints || animation.completed;
            controls["toggle-growth"].textContent = animation.completed ? "已完成" : animation.running ? "暂停" : "继续";
            controls["restart-growth"].disabled = !isPoints;
            if (log) console.log(status.textContent);
        }

        growth = createPointGrowth({ onUpdate: () => drawCurrentMode(), onError: reportError, rate: 500 });

        function readCount() {
            const count = Number(countControl.value);
            if (!Number.isInteger(count) || count < 5000 || count > 50000) {
                countControl.setCustomValidity("请输入 5000～50000 的整数；不会用无效值替换现有点云。");
                countControl.reportValidity();
                return null;
            }
            countControl.setCustomValidity("");
            return count;
        }
        function useSelectedGeometry(forceNewChaos = false) {
            if (failed) return;
            const method = methodControl.value;
            let next;
            if (method === "chaos") {
                const count = readCount();
                if (count === null) {
                    methodControl.value = active ? active.method : "recursive";
                    return;
                }
                if (!chaosCache || chaosCache.count !== count || forceNewChaos) {
                    // 唯一的随机生成入口：每帧动画只改变绘制数量，不调用此算法。
                    const points = generateChaosPoints(vertices, count);
                    const data = new Float32Array(points.flat());
                    if (data.length !== count * 2 || !data.every(Number.isFinite)) {
                        throw new Error("混沌游戏坐标数量或数值无效。");
                    }
                    chaosCache = { method, count, data: { points: data } };
                }
                next = chaosCache;
                modeControl.value = "points";
            } else if (method === "recursive") {
                const depth = Number(depthControl.value);
                if (!Number.isInteger(depth) || depth < 0 || depth > 6) {
                    throw new RangeError("递归深度必须是 0～6 的整数。");
                }
                if (!recursiveCache || recursiveCache.depth !== depth) {
                    const triangles = subdivide(vertices, depth);
                    if (triangles.length !== 3 ** depth) throw new Error("递归计数与 3^depth 不符。");
                    recursiveCache = { method, depth, triangleCount: triangles.length,
                        data: buildRecursiveRenderData(triangles) };
                }
                next = recursiveCache;
            } else {
                throw new Error("未知生成算法。");
            }
            const changed = active !== next;
            // 换数据时重置进度；模式/配色/视图变化不会重新生成随机点。
            growth.pause(false);
            active = next;
            if (changed) growth.reset(active.data.points.length / 2);
            if (modeControl.value === "points" && !document.hidden) growth.start();
            drawCurrentMode(true);
        }
        function changeMode(mode) {
            if (!Object.prototype.hasOwnProperty.call(modeNames, mode)) throw new Error("未知渲染模式。");
            modeControl.value = mode;
            if (mode !== "points" && methodControl.value === "chaos") {
                methodControl.value = "recursive"; // 不能把随机点直接当成有边的三角形。
            }
            useSelectedGeometry();
        }
        function toggleGrowth() {
            if (failed || !active || modeControl.value !== "points") return false;
            const animation = growth.getState();
            if (animation.running) growth.pause();
            else if (!animation.completed && !document.hidden) growth.start();
            return true;
        }
        function listen(element, name, action) {
            element.addEventListener(name, event => {
                try { action(event); } catch (error) { reportError(error); }
            });
        }
        listen(methodControl, "change", () => useSelectedGeometry());
        listen(modeControl, "change", () => changeMode(modeControl.value));
        listen(depthControl, "change", () => useSelectedGeometry());
        listen(countControl, "input", () => countControl.setCustomValidity(""));
        listen(controls["apply-point-count"], "click", () => {
            useSelectedGeometry(true);
            canvas.focus({ preventScroll: true });
        });
        listen(sizeControl, "input", () => drawCurrentMode());
        listen(colorControl, "change", () => drawCurrentMode(true));
        listen(controls["toggle-growth"], "click", () => {
            toggleGrowth(); canvas.focus({ preventScroll: true });
        });
        listen(controls["restart-growth"], "click", () => {
            if (!failed && modeControl.value === "points") growth.restart();
            canvas.focus({ preventScroll: true });
        });
        useSelectedGeometry();
        interactions = createCanvasInteractions(canvas, {
            onViewChange(nextView) { view = nextView; drawCurrentMode(); },
            onModeChange: changeMode, onToggleGrowth: toggleGrowth, onError: reportError
        });
        listen(controls["reset-view"], "click", () => {
            interactions.reset(); canvas.focus({ preventScroll: true });
        });
        // 离开标签页主动暂停；回来后手动继续，避免后台时间被算入点云生长。
        listen(document, "visibilitychange", () => { if (document.hidden) growth.pause(); });
        listen(window, "pagehide", () => { growth.pause(false); });
    } catch (error) {
        if (interactions) interactions.dispose();
        reportError(error);
    }
});
