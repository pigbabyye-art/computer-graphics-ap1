"use strict";

/**
 * 创建仅负责 WebGL 绘制的对象。
 * 几何生成、控件监听由 geometry.js 和 recursive-ui.js 负责。
 * 依赖：教材 Common/initShaders.js，以及 HTML 中的两个着色器。
 * @param {HTMLCanvasElement} canvas
 * @returns {{draw: Function, pointSizeRange: ReadonlyArray<number>}}
 * draw(data, mode, options) 仅绘制，不生成几何；options 指定点大小、前景/背景色与视图变换。
 */
function createRecursiveRenderer(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("找不到 gl-canvas 画布，请检查 recursive.html。");
    }

    const gl = canvas.getContext("webgl2");
    if (!gl) {
        throw new Error("无法创建 WebGL 2.0 上下文。");
    }
    if (typeof initShaders !== "function") {
        throw new Error("工具库未加载：请检查 Common/initShaders.js 路径。");
    }

    // 初始化只执行一次，不在每次切换模式时重新创建程序或缓冲区。
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    if (!program || program === -1) {
        throw new Error("着色器初始化失败，请检查弹窗与浏览器控制台。");
    }
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error("着色器链接失败：" + gl.getProgramInfoLog(program));
    }

    const buffer = gl.createBuffer();
    if (!buffer) {
        throw new Error("无法创建顶点缓冲区。");
    }
    const aPosition = gl.getAttribLocation(program, "aPosition");
    if (aPosition < 0) {
        throw new Error("顶点着色器中找不到 aPosition。");
    }

    // uniform 是一次绘制中由所有顶点/片元共享的参数，不是顶点坐标。
    const uPointSize = gl.getUniformLocation(program, "uPointSize");
    const uColor = gl.getUniformLocation(program, "uColor");
    const uScale = gl.getUniformLocation(program, "uScale");
    const uTranslation = gl.getUniformLocation(program, "uTranslation");
    if ([uPointSize, uColor, uScale, uTranslation].some(location => location === null)) {
        throw new Error("着色器缺少必要 uniform，请同步更新 recursive.html 和绘图脚本。");
    }

    // 查询设备支持的点大小，界面会据此限制滑条范围。
    const supported = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    if (!supported || !Number.isFinite(supported[0]) ||
        !Number.isFinite(supported[1]) || supported[0] <= 0 || supported[1] < supported[0]) {
        throw new Error("无法读取有效的点大小范围。");
    }
    const pointSizeRange = Object.freeze([supported[0], supported[1]]);
    const defaultPointSize = Math.min(supported[1], Math.max(supported[0], 4));
    let uploadedData = null;

    function checkColor(value, name) {
        if (!(Array.isArray(value) || value instanceof Float32Array) ||
            value.length !== 4 || !value.every(v => Number.isFinite(v) && v >= 0 && v <= 1)) {
            throw new TypeError(name + "必须由四个 0～1 的有限数值组成。");
        }
    }

    const primitiveTypes = {
        points: gl.POINTS,
        lines: gl.LINES,
        triangles: gl.TRIANGLES
    };

    /**
     * data 按 x1,y1,x2,y2,... 排列。
     * 返回提交给 drawArrays 的顶点记录数，不是去重后的点数。
     */
    function draw(data, mode, options = {}) {
        const {
            pointSize = defaultPointSize,
            color = [0.1, 0.5, 0.9, 1.0],
            background = [1.0, 1.0, 1.0, 1.0],
            scale = 1,
            translation = [0, 0],
            count = null // null 表示绘制全部；点云动画可指定前 count 个顶点。
        } = options;
        if (!Number.isFinite(pointSize) || pointSize < pointSizeRange[0] ||
            pointSize > pointSizeRange[1]) {
            throw new RangeError("点大小超出当前设备支持的范围。");
        }
        if (!Number.isFinite(scale) || scale < 0.25 || scale > 20) {
            throw new RangeError("视图缩放必须在 0.25～20 之间。");
        }
        if (!(Array.isArray(translation) || translation instanceof Float32Array) ||
            translation.length !== 2 || !translation.every(Number.isFinite)) {
            throw new TypeError("平移量必须是两个有限数值 [tx, ty]。");
        }
        checkColor(color, "图形颜色");
        checkColor(background, "背景颜色");
        if (!(data instanceof Float32Array) || data.length % 2 !== 0) {
            throw new TypeError("绘图数据必须是长度为偶数的 Float32Array。");
        }
        if (!Object.prototype.hasOwnProperty.call(primitiveTypes, mode)) {
            throw new Error("未知渲染模式：" + mode);
        }

        // 每个二维顶点有两个数，因此顶点数量要除以 2。
        const vertexCount = data.length / 2;
        const groupSize = mode === "lines" ? 2 : mode === "triangles" ? 3 : 1;
        if (vertexCount % groupSize !== 0) {
            throw new Error("顶点数量不符合当前图元的分组规则。");
        }

        const drawCount = count === null ? vertexCount : count;
        if (!Number.isInteger(drawCount) || drawCount < 0 || drawCount > vertexCount ||
            drawCount % groupSize !== 0) {
            throw new RangeError("绘制数量必须为有效顶点范围内、符合图元分组的整数。");
        }

        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        // 本页生成的坐标数组不原地修改。数组更换时才重新上传；
        // 只调点大小或配色时，复用已上传的数据，不重算递归。
        if (data !== uploadedData) {
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
            uploadedData = data;
        }

        // 从缓冲区中连续读取，每两个 float 构成一个 aPosition。
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aPosition);

        // 必须先 useProgram，再为该程序的 uniform 赋值。
        gl.uniform1f(uPointSize, pointSize);
        gl.uniform4fv(uColor, color);
        // 只改变显示位置，不修改 geometry.js 的坐标或重新上传顶点。
        gl.uniform1f(uScale, scale);
        gl.uniform2fv(uTranslation, translation);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(...background);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(primitiveTypes[mode], 0, drawCount);

        // 本阶段保留错误检查，避免把静默绘制失败误报为成功。
        const errorCode = gl.getError();
        if (errorCode !== gl.NO_ERROR) {
            throw new Error("WebGL 错误码：0x" + errorCode.toString(16));
        }
        return drawCount;
    }

    return { draw, pointSizeRange };
}
